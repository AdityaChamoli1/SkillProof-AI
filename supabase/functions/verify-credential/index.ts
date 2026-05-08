import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}

function clean(value: string | null) {
  return value?.trim() ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Credential verification service is not configured." }, 500);

    const url = new URL(req.url);
    let id = clean(url.searchParams.get("id"));
    let hash = clean(url.searchParams.get("hash")).toLowerCase();

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      id = clean(typeof body.id === "string" ? body.id : id);
      hash = clean(typeof body.hash === "string" ? body.hash : hash).toLowerCase();
    }

    if (!id && !hash) return json({ error: "Provide a credential id or SHA-256 fingerprint." }, 400);
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json({ error: "Invalid credential id." }, 400);
    }
    if (hash && !/^[a-f0-9]{64}$/i.test(hash)) return json({ error: "Invalid SHA-256 fingerprint." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    let query = admin
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at,content_type,file_size")
      .eq("verified", true);

    query = id ? query.eq("id", id) : query.eq("file_hash", hash);
    const { data: credential, error } = await query.maybeSingle();

    if (error) {
      console.error("verify-credential lookup error", error);
      return json({ error: "Could not verify credential." }, 500);
    }
    if (!credential) return json({ verified: false, credential: null }, 404);

    let preview_url: string | null = null;
    if (credential.file_url) {
      const { data, error: signedError } = await admin.storage.from("certificates").createSignedUrl(credential.file_url, 60 * 15, {
        download: false,
      });
      if (signedError) console.error("verify-credential signed url error", signedError);
      preview_url = data?.signedUrl ?? null;
    }

    return json({ verified: true, credential, preview_url });
  } catch (error) {
    console.error("verify-credential error", error);
    return json({ error: error instanceof Error ? error.message : "Credential verification failed." }, 500);
  }
});
