// Resume analysis edge function: extracts text from a stored PDF/DOCX,
// runs Lovable AI to compute ATS score, skills, summary, and suggestions,
// then writes results back to the resumes table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Lightweight PDF text extraction (covers most ATS resumes; falls back gracefully)
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const text = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const re = /\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(
      m[1]
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\n")
        .replace(/\\t/g, " "),
    );
  }
  // Also capture array TJ strings
  const re2 = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
  while ((m = re2.exec(text))) {
    const inner = m[1];
    const sre = /\(((?:\\.|[^()\\])*)\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = sre.exec(inner))) out.push(sm[1]);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

// DOCX text extraction: unzip and read word/document.xml
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // @ts-ignore deno deploy
  const { unzip } = await import("https://deno.land/x/zipjs@v2.7.45/index.js");
  // Fallback simple parser using fflate
  const fflate = await import("https://esm.sh/fflate@0.8.2");
  return await new Promise((resolve, reject) => {
    fflate.unzip(bytes, (err, files) => {
      if (err) return reject(err);
      const docXml = files["word/document.xml"];
      if (!docXml) return resolve("");
      const xml = new TextDecoder().decode(docXml);
      const text = xml
        .replace(/<w:p[^>]*>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      resolve(text);
    });
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (validates user)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Service client for storage/db writes after we own-check
    const admin = createClient(supabaseUrl, serviceKey);

    const { resumeId } = await req.json();
    if (!resumeId) {
      return new Response(JSON.stringify({ error: "resumeId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: resume, error: rErr } = await admin
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (rErr || !resume) {
      return new Response(JSON.stringify({ error: "Resume not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("resumes").update({ status: "processing" }).eq("id", resumeId);

    // Download file from storage. file_url stores the storage path.
    const { data: file, error: dErr } = await admin.storage
      .from("resumes")
      .download(resume.file_url!);
    if (dErr || !file) throw new Error("Failed to download resume file");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const lower = (resume.file_url as string).toLowerCase();
    let rawText = "";
    if (lower.endsWith(".pdf")) rawText = await extractPdfText(bytes);
    else if (lower.endsWith(".docx")) rawText = await extractDocxText(bytes);
    else rawText = new TextDecoder().decode(bytes);

    rawText = rawText.slice(0, 18000); // cap tokens
    if (rawText.trim().length < 50) {
      await admin
        .from("resumes")
        .update({ status: "failed", raw_text: rawText })
        .eq("id", resumeId);
      return new Response(
        JSON.stringify({ error: "Could not extract text. Try a text-based PDF or DOCX." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lovable AI structured analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert ATS and recruiter. Analyze resumes and return strict JSON via the provided tool.",
          },
          {
            role: "user",
            content:
              `Analyze this resume text and return scores, skills, summary, and improvement suggestions.\n\n---RESUME---\n${rawText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_analysis",
              description: "Submit structured resume analysis",
              parameters: {
                type: "object",
                properties: {
                  ats_score: { type: "number", minimum: 0, maximum: 100 },
                  trust_score: { type: "number", minimum: 0, maximum: 100 },
                  ai_summary: { type: "string" },
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["technical", "soft", "language", "tool", "domain"],
                        },
                        confidence: { type: "number", minimum: 0, maximum: 100 },
                      },
                      required: ["name", "category", "confidence"],
                    },
                  },
                  ai_suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["title", "detail", "severity"],
                    },
                  },
                  missing_keywords: { type: "array", items: { type: "string" } },
                  strengths: { type: "array", items: { type: "string" } },
                },
                required: [
                  "ats_score",
                  "trust_score",
                  "ai_summary",
                  "skills",
                  "ai_suggestions",
                  "missing_keywords",
                  "strengths",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      await admin.from("resumes").update({ status: "failed" }).eq("id", resumeId);
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500;
      const msg =
        aiResp.status === 429
          ? "Rate limit reached. Try again shortly."
          : aiResp.status === 402
          ? "AI credits exhausted. Add credits to continue."
          : "AI analysis failed.";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const args = JSON.parse(toolCall.function.arguments);

    const update = {
      status: "completed",
      raw_text: rawText,
      ats_score: Math.round(args.ats_score),
      trust_score: Math.round(args.trust_score),
      ai_summary: args.ai_summary,
      skills: args.skills,
      ai_suggestions: {
        suggestions: args.ai_suggestions,
        missing_keywords: args.missing_keywords,
        strengths: args.strengths,
      },
      updated_at: new Date().toISOString(),
    };
    await admin.from("resumes").update(update).eq("id", resumeId);

    return new Response(JSON.stringify({ ok: true, ...update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
