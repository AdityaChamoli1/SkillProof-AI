import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .slice(0, 120) || "Resume";
}

function extensionFor(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ALLOWED_EXTENSIONS.has(ext)) return ext;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "";
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in before uploading a resume." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Upload service is not configured." }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Your session expired. Please sign in again." }, 401);

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Resume uploads must use multipart/form-data." }, 415);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Attach a PDF or DOCX resume file." }, 400);

    const ext = extensionFor(file);
    if (!ext || (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext))) {
      return json({ error: "Only PDF and DOCX resumes are supported." }, 400);
    }
    if (file.size <= 0) return json({ error: "The selected resume is empty." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Resume files must be 10MB or smaller." }, 413);

    const bytes = await file.arrayBuffer();
    const hash = await sha256Hex(bytes);
    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: duplicate, error: dupErr } = await admin
      .from("resumes")
      .select("id,title,status,ats_score,processing_error,created_at")
      .eq("user_id", userId)
      .eq("file_hash", hash)
      .neq("status", "failed")
      .maybeSingle();
    if (dupErr) {
      console.error("duplicate-check error", dupErr);
      return json({ error: "Could not verify duplicate uploads." }, 500);
    }
    if (duplicate) {
      return json(
        {
          error: "This resume has already been uploaded.",
          duplicate: true,
          resume: duplicate,
        },
        409,
      );
    }

    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await admin.storage.from("resumes").upload(path, bytes, {
      contentType: file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      upsert: false,
    });
    if (uploadErr) {
      console.error("resume-storage upload error", uploadErr);
      return json({ error: uploadErr.message || "Resume storage upload failed." }, 500);
    }

    const { data: row, error: insertErr } = await admin
      .from("resumes")
      .insert({
        user_id: userId,
        title: cleanFileName(file.name),
        file_url: path,
        file_hash: hash,
        status: "uploading",
        processing_error: null,
        parsed_metadata: {
          original_name: file.name,
          content_type: file.type || null,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select("id,title,status,ats_score,trust_score,processing_error,created_at,file_url,file_hash")
      .single();

    if (insertErr) {
      console.error("resume-db insert error", insertErr);
      await admin.storage.from("resumes").remove([path]);
      return json({ error: insertErr.message || "Could not save resume metadata." }, 500);
    }

    return json({ ok: true, resume: row }, 201);
  } catch (error) {
    console.error("upload-resume error", error);
    return json({ error: error instanceof Error ? error.message : "Resume upload failed." }, 500);
  }
});
