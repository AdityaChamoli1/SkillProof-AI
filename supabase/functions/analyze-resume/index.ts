import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";
import { z } from "https://esm.sh/zod@3.25.76";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.2";
import * as fflate from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ resumeId: z.string().uuid() });
const SkillSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(["technical", "soft", "language", "tool", "domain"]).catch("technical"),
  confidence: z.coerce.number().min(0).max(100).catch(75),
});
const SuggestionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(700),
  severity: z.enum(["low", "medium", "high"]).catch("medium"),
});
const AnalysisSchema = z.object({
  ats_score: z.coerce.number().min(0).max(100),
  trust_score: z.coerce.number().min(0).max(100),
  ai_summary: z.string().trim().min(1).max(1600),
  skills: z.array(SkillSchema).max(30).default([]),
  ai_suggestions: z.array(SuggestionSchema).max(12).default([]),
  missing_keywords: z.array(z.string().trim().min(1).max(70)).max(20).default([]),
  strengths: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
  education: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  experience: z.array(z.string().trim().min(1).max(220)).max(16).default([]),
  projects: z.array(z.string().trim().min(1).max(220)).max(12).default([]),
  certifications: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
});

type AdminClient = ReturnType<typeof createClient>;
type Analysis = z.infer<typeof AnalysisSchema>;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function compact(text: string) {
  return text.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXmlText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPdfTextWithFallback(bytes: Uint8Array) {
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = compact(result.text || "");
    if (text.length > 40) return { text, metadata: { parser: "unpdf", total_pages: result.totalPages } };
  } catch (error) {
    console.error("pdf-parser unpdf error", error);
  }

  const latin = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const single = /\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = single.exec(latin))) out.push(match[1]);
  const array = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
  while ((match = array.exec(latin))) {
    const inner = match[1];
    const stringRe = /\(((?:\\.|[^()\\])*)\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = stringRe.exec(inner))) out.push(sm[1]);
  }
  const text = compact(
    out
      .join(" ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, " ")
      .replace(/\\\\/g, "\\"),
  );
  return { text, metadata: { parser: "pdf-text-operator-fallback" } };
}

async function extractDocxText(bytes: Uint8Array) {
  const files = fflate.unzipSync(bytes);
  const names = ["word/document.xml", ...Object.keys(files).filter((name) => /^word\/(header|footer)\d*\.xml$/.test(name))];
  const sections = names
    .map((name) => files[name])
    .filter(Boolean)
    .map((file) => decodeXmlText(new TextDecoder().decode(file)));
  return {
    text: compact(sections.join("\n")),
    metadata: { parser: "fflate-docx", xml_parts: sections.length },
  };
}

async function extractResumeText(bytes: Uint8Array, path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return await extractPdfTextWithFallback(bytes);
  if (lower.endsWith(".docx")) return await extractDocxText(bytes);
  throw new Error("Unsupported resume file type. Upload a PDF or DOCX file.");
}

const SKILL_BANK: Array<{ name: string; category: Analysis["skills"][number]["category"]; terms: string[] }> = [
  { name: "JavaScript", category: "technical", terms: ["javascript", " js ", "node.js", "nodejs"] },
  { name: "TypeScript", category: "technical", terms: ["typescript"] },
  { name: "React", category: "technical", terms: ["react", "react.js", "reactjs"] },
  { name: "Python", category: "technical", terms: ["python", "django", "fastapi", "flask"] },
  { name: "SQL", category: "technical", terms: ["sql", "postgres", "mysql", "database"] },
  { name: "AWS", category: "tool", terms: ["aws", "amazon web services", "lambda", "ec2", "s3"] },
  { name: "Azure", category: "tool", terms: ["azure"] },
  { name: "Google Cloud", category: "tool", terms: ["gcp", "google cloud"] },
  { name: "Docker", category: "tool", terms: ["docker", "container"] },
  { name: "Kubernetes", category: "tool", terms: ["kubernetes", " k8s "] },
  { name: "Machine Learning", category: "domain", terms: ["machine learning", "ml model", "tensorflow", "pytorch", "scikit"] },
  { name: "Data Analysis", category: "domain", terms: ["data analysis", "analytics", "tableau", "power bi"] },
  { name: "Product Management", category: "domain", terms: ["product management", "roadmap", "go-to-market"] },
  { name: "Leadership", category: "soft", terms: ["leadership", "managed", "mentored", "led team"] },
  { name: "Communication", category: "soft", terms: ["communication", "stakeholder", "presented"] },
];
const MISSING_KEYWORDS = ["metrics", "impact", "leadership", "collaboration", "ownership", "scale", "automation", "security", "testing", "deployment"];

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function extractBulletSection(rawText: string, heading: RegExp, stop: RegExp) {
  const source = rawText.replace(/\r/g, "\n");
  const start = source.search(heading);
  if (start === -1) return [];
  const tail = source.slice(start).replace(heading, "");
  const end = tail.search(stop);
  const block = (end === -1 ? tail : tail.slice(0, end)).slice(0, 1400);
  return block
    .split(/\n|•|- /)
    .map((line) => compact(line))
    .filter((line) => line.length > 10)
    .slice(0, 8);
}

function fallbackAnalysis(rawText: string): Analysis {
  const lower = ` ${rawText.toLowerCase()} `;
  const skills = SKILL_BANK
    .filter((skill) => hasAny(lower, skill.terms))
    .map((skill) => ({ name: skill.name, category: skill.category, confidence: 74 + Math.min(20, skill.terms.length * 3) }));
  const education = extractBulletSection(rawText, /education|academic background/i, /experience|projects|certifications|skills/i);
  const experience = extractBulletSection(rawText, /experience|employment|work history/i, /education|projects|certifications|skills/i);
  const projects = extractBulletSection(rawText, /projects|portfolio/i, /education|experience|certifications|skills/i);
  const certifications = extractBulletSection(rawText, /certifications|licenses|credentials/i, /education|experience|projects|skills/i);
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(rawText);
  const hasPhone = /(?:\+?\d[\d .()-]{7,}\d)/.test(rawText);
  const hasLinks = /linkedin\.com|github\.com|https?:\/\//i.test(rawText);
  const hasMetrics = /\b\d+\s?(%|percent|x|k|m|million|users|customers|revenue|cost|hours|days)\b/i.test(rawText);
  const lengthScore = rawText.length > 1800 ? 18 : rawText.length > 900 ? 12 : 6;
  const sectionScore = [education.length, experience.length, projects.length, certifications.length].filter(Boolean).length * 8;
  const contactScore = [hasEmail, hasPhone, hasLinks].filter(Boolean).length * 4;
  const skillScore = Math.min(28, skills.length * 4);
  const ats_score = Math.max(38, Math.min(92, 30 + lengthScore + sectionScore + contactScore + skillScore + (hasMetrics ? 10 : 0)));
  const missing_keywords = MISSING_KEYWORDS.filter((word) => !lower.includes(word)).slice(0, 8);
  const suggestions = [
    !hasMetrics && {
      title: "Quantify achievements",
      detail: "Add measurable outcomes such as revenue impact, cost savings, performance improvements, user growth, or delivery speed.",
      severity: "high" as const,
    },
    skills.length < 6 && {
      title: "Add a richer skills section",
      detail: "Include role-specific tools, frameworks, platforms, and methodologies so ATS systems can match the resume more confidently.",
      severity: "medium" as const,
    },
    !hasLinks && {
      title: "Add verification links",
      detail: "Include LinkedIn, GitHub, portfolio, credential, or publication links to improve recruiter trust signals.",
      severity: "medium" as const,
    },
    experience.length === 0 && {
      title: "Clarify work history",
      detail: "Create a dedicated experience section with employer, role, dates, responsibilities, and impact bullets.",
      severity: "high" as const,
    },
  ].filter(Boolean) as Analysis["ai_suggestions"];

  return {
    ats_score,
    trust_score: Math.max(35, Math.min(96, ats_score - 4 + contactScore + (certifications.length ? 6 : 0))),
    ai_summary: `Fallback ATS analysis completed from parsed resume text. The profile shows ${skills.length || "limited"} detected skills${experience.length ? " and identifiable experience history" : ""}. Improve keyword coverage and measurable impact to increase matching confidence.`,
    skills,
    ai_suggestions: suggestions.length ? suggestions : [{ title: "Tune for target roles", detail: "Mirror the exact keywords from priority job descriptions while keeping the wording truthful and specific.", severity: "low" }],
    missing_keywords,
    strengths: [
      hasEmail || hasPhone ? "Contact information is present." : "Resume text was readable and parsable.",
      skills.length ? `Detected ${skills.length} relevant skill signals.` : "Document structure can be analyzed for ATS improvements.",
      hasMetrics ? "Resume includes measurable results." : "Resume is ready for keyword and impact optimization.",
    ],
    education,
    experience,
    projects,
    certifications,
  };
}

function normalizeAnalysis(value: unknown, rawText: string): Analysis {
  const parsed = AnalysisSchema.safeParse(value);
  if (!parsed.success) {
    console.error("AI analysis validation error", parsed.error.flatten());
    return fallbackAnalysis(rawText);
  }
  return parsed.data;
}

async function fetchAiAnalysis(rawText: string): Promise<unknown | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("AI key missing; using fallback ATS analysis");
    return null;
  }

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content:
          "You are a senior ATS analyst. Return only a tool call with precise JSON. Be factual, concise, and never invent credentials.",
      },
      {
        role: "user",
        content:
          `Analyze this resume. Extract skills, education, experience, projects, certifications, ATS score, trust score, strengths, missing keywords, and actionable suggestions.\n\n---RESUME TEXT---\n${rawText.slice(0, 40000)}`,
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
                    category: { type: "string", enum: ["technical", "soft", "language", "tool", "domain"] },
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
              education: { type: "array", items: { type: "string" } },
              experience: { type: "array", items: { type: "string" } },
              projects: { type: "array", items: { type: "string" } },
              certifications: { type: "array", items: { type: "string" } },
            },
            required: ["ats_score", "trust_score", "ai_summary", "skills", "ai_suggestions", "missing_keywords", "strengths", "education", "experience", "projects", "certifications"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "submit_analysis" } },
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error("AI analysis error", { attempt, status: response.status, body: text.slice(0, 1000) });
        if (attempt < 2 && response.status >= 500) continue;
        return null;
      }
      const payload = JSON.parse(text);
      const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("AI analysis missing tool call", payload);
        return null;
      }
      return JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error("AI analysis request exception", { attempt, error });
      if (attempt === 2) return null;
    }
  }
  return null;
}

async function markFailed(admin: AdminClient, resumeId: string, error: string, rawText?: string) {
  const { error: updateErr } = await admin
    .from("resumes")
    .update({
      status: "failed",
      processing_error: error,
      raw_text: rawText ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resumeId);
  if (updateErr) console.error("failed-status update error", updateErr);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Resume analysis service is not configured." }, 500);

  const admin = createClient(supabaseUrl, serviceKey);
  let resumeId = "";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in before analyzing a resume." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Your session expired. Please sign in again." }, 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) return json({ error: "A valid resume id is required." }, 400);
    resumeId = parsedBody.data.resumeId;

    const { data: resume, error: resumeErr } = await admin
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (resumeErr) {
      console.error("resume lookup error", resumeErr);
      return json({ error: "Could not load the resume record." }, 500);
    }
    if (!resume) return json({ error: "Resume not found." }, 404);
    if (!resume.file_url) {
      await markFailed(admin, resumeId, "Resume file path is missing.");
      return json({ error: "Resume file path is missing." }, 422);
    }

    const { error: processingErr } = await admin
      .from("resumes")
      .update({ status: "processing", processing_error: null, updated_at: new Date().toISOString() })
      .eq("id", resumeId);
    if (processingErr) {
      console.error("processing-status update error", processingErr);
      return json({ error: "Could not update resume processing status." }, 500);
    }

    const { data: file, error: downloadErr } = await admin.storage.from("resumes").download(resume.file_url);
    if (downloadErr || !file) {
      const message = downloadErr?.message || "Failed to download resume file.";
      console.error("resume-storage download error", downloadErr);
      await markFailed(admin, resumeId, message);
      return json({ error: message }, 500);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength === 0) {
      await markFailed(admin, resumeId, "The uploaded resume file is empty.");
      return json({ error: "The uploaded resume file is empty." }, 422);
    }

    let rawText = "";
    let parsedMetadata: Record<string, unknown> = {};
    try {
      const extracted = await extractResumeText(bytes, resume.file_url);
      rawText = extracted.text.slice(0, 40000);
      parsedMetadata = extracted.metadata;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume parsing failed.";
      console.error("resume parsing error", error);
      await markFailed(admin, resumeId, message);
      return json({ error: message }, 422);
    }

    if (rawText.trim().length < 50) {
      const message = "Could not extract enough text. Upload a text-based PDF or DOCX instead of a scanned or corrupted file.";
      await markFailed(admin, resumeId, message, rawText);
      return json({ error: message }, 422);
    }

    const aiValue = await fetchAiAnalysis(rawText);
    const analysis = normalizeAnalysis(aiValue ?? fallbackAnalysis(rawText), rawText);
    const update = {
      status: "completed",
      processing_error: null,
      raw_text: rawText,
      ats_score: Math.round(analysis.ats_score),
      trust_score: Math.round(analysis.trust_score),
      ai_summary: analysis.ai_summary,
      skills: analysis.skills,
      ai_suggestions: {
        suggestions: analysis.ai_suggestions,
        missing_keywords: analysis.missing_keywords,
        strengths: analysis.strengths,
        education: analysis.education,
        experience: analysis.experience,
        projects: analysis.projects,
        certifications: analysis.certifications,
      },
      parsed_metadata: {
        ...(typeof resume.parsed_metadata === "object" && resume.parsed_metadata ? resume.parsed_metadata : {}),
        ...parsedMetadata,
        text_length: rawText.length,
        analyzed_at: new Date().toISOString(),
        analysis_source: aiValue ? "ai" : "fallback",
      },
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin.from("resumes").update(update).eq("id", resumeId);
    if (updateErr) {
      console.error("resume analysis save error", updateErr);
      await markFailed(admin, resumeId, updateErr.message, rawText);
      return json({ error: "Analysis completed but could not be saved." }, 500);
    }

    return json({ ok: true, resumeId, ...update });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume analysis failed.";
    console.error("analyze-resume error", error);
    if (resumeId) await markFailed(admin, resumeId, message);
    return json({ error: message }, 500);
  }
});
