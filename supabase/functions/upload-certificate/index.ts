import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 180) : fallback;
}

function extensionFor(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ALLOWED_EXTENSIONS.has(ext)) return ext;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
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
    if (!authHeader) return json({ error: "Sign in before uploading certificates." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Certificate upload service is not configured." }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Your session expired. Please sign in again." }, 401);

    if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      return json({ error: "Certificate uploads must use multipart/form-data." }, 415);
    }

    const form = await req.formData();
    const file = form.get("file");
    const title = cleanText(form.get("title"));
    const issuer = cleanText(form.get("issuer"));
    const issuedAt = cleanText(form.get("issued_at"));
    const clientHash = cleanText(form.get("client_hash")).toLowerCase();

    if (!title) return json({ error: "Add a certificate title before uploading." }, 400);
    if (!(file instanceof File)) return json({ error: "Attach a PDF or image certificate file." }, 400);

    const ext = extensionFor(file);
    if (!ext || (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext))) {
      return json({ error: "Certificates must be PDF, PNG, JPG, or WEBP files." }, 400);
    }
    if (file.size <= 0) return json({ error: "The selected certificate file is empty." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Certificate files must be 15MB or smaller." }, 413);
    if (issuedAt && !/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) return json({ error: "Issued date must be a valid date." }, 400);

    const bytes = await file.arrayBuffer();
    const hash = await sha256Hex(bytes);
    if (clientHash && (!HASH_PATTERN.test(clientHash) || clientHash !== hash)) {
      return json({ error: "Certificate fingerprint mismatch. Please retry the upload." }, 400);
    }
    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing, error: existingErr } = await admin
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at,content_type,file_size")
      .eq("user_id", userId)
      .eq("file_hash", hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) {
      console.error("certificate duplicate lookup error", existingErr);
      return json({ error: "Could not check for duplicate credentials." }, 500);
    }
    if (existing) return json({ ok: true, duplicate: true, certificate: existing }, 200);

    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const contentType = file.type || (ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`);
    const { error: uploadErr } = await admin.storage.from("certificates").upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (uploadErr) {
      console.error("certificate-storage upload error", uploadErr);
      return json({ error: uploadErr.message || "Certificate storage upload failed." }, 500);
    }

    const { data: row, error: insertErr } = await admin
      .from("certificates")
      .insert({
        user_id: userId,
        title,
        issuer: issuer || null,
        issued_at: issuedAt || null,
        file_url: path,
        file_hash: hash,
        content_type: contentType,
        file_size: file.size,
        verified: true,
      })
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at,content_type,file_size")
      .single();

    if (insertErr) {
      console.error("certificate-db insert error", insertErr);
      await admin.storage.from("certificates").remove([path]);
      return json({ error: insertErr.message || "Could not save certificate metadata." }, 500);
    }

    return json({ ok: true, certificate: row }, 201);
  } catch (error) {
    console.error("upload-certificate error", error);
    return json({ error: error instanceof Error ? error.message : "Certificate upload failed." }, 500);
  }
});
