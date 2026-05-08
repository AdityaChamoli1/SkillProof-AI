import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, ShieldCheck, ShieldAlert, Loader2, FileText, FileImage, Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Credential = {
  id: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  file_hash: string | null;
  file_url: string | null;
  verified: boolean;
  created_at: string;
  content_type: string | null;
  file_size: number | null;
};

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; cert: Credential; previewUrl: string | null }
  | { state: "not_found" }
  | { state: "error"; message: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isHash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isImage(cert: Credential) {
  return Boolean(cert.content_type?.startsWith("image/"));
}

function isPdf(cert: Credential) {
  return cert.content_type === "application/pdf" || cert.file_url?.toLowerCase().endsWith(".pdf");
}

export default function Verify() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const initialQuery = id ?? params.get("hash") ?? "";
  const [q, setQ] = useState(initialQuery);
  const [result, setResult] = useState<Result>({ state: "idle" });

  const verifiedUrl = useMemo(() => {
    if (result.state !== "found") return "";
    return `${window.location.origin}/verify/${result.cert.id}`;
  }, [result]);

  const verify = async (value: string) => {
    const query = value.trim();
    if (!query) return;
    if (!isHash(query) && !isUuid(query)) {
      setResult({ state: "error", message: "Enter a valid credential ID or 64-character SHA-256 fingerprint." });
      return;
    }

    setResult({ state: "loading" });
    const { data, error } = await supabase.functions.invoke("verify-credential", {
      body: isUuid(query) ? { id: query } : { hash: query.toLowerCase() },
    });

    if (error) {
      setResult({ state: "error", message: error.message || "Could not verify credential." });
      return;
    }

    if (!data?.verified || !data?.credential) {
      setResult({ state: "not_found" });
      return;
    }

    setResult({ state: "found", cert: data.credential as Credential, previewUrl: data.preview_url ?? null });
  };

  useEffect(() => {
    if (initialQuery) verify(initialQuery);
  }, [initialQuery]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="container-tight py-20 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="mb-4">SkillProof public verification</Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Verify a credential</h1>
        <p className="mt-4 text-muted-foreground">Confirm a certificate by credential ID or SHA-256 fingerprint.</p>
      </div>

      <Card className="mx-auto mt-10 max-w-4xl overflow-hidden">
        <CardHeader>
          <CardTitle>Verification explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (isUuid(q)) setParams({});
              else setParams({ hash: q.trim() });
              verify(q);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 font-mono text-xs"
                placeholder="credential id or sha256 fingerprint"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={result.state === "loading"}>
              {result.state === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify
            </Button>
          </form>

          {result.state === "loading" && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking credential…
            </div>
          )}

          {result.state === "found" && (
            <div className="grid overflow-hidden rounded-lg border border-success/40 bg-success/5 lg:grid-cols-[1.05fr_1fr]">
              <div className="min-h-80 bg-background/70">
                {result.previewUrl && isImage(result.cert) && (
                  <img src={result.previewUrl} alt={`${result.cert.title} credential preview`} className="h-full w-full object-contain" />
                )}
                {result.previewUrl && isPdf(result.cert) && <iframe title={`${result.cert.title} PDF preview`} src={result.previewUrl} className="h-full min-h-80 w-full" />}
                {!result.previewUrl && (
                  <div className="grid h-full min-h-80 place-items-center text-center text-sm text-muted-foreground">
                    {isImage(result.cert) ? <FileImage className="mb-2 h-8 w-8" /> : <FileText className="mb-2 h-8 w-8" />}
                    Preview unavailable
                  </div>
                )}
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-center gap-2 text-success">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-medium">Credential verified</span>
                </div>

                <dl className="grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="col-span-2 font-medium">{result.cert.title}</dd>
                  <dt className="text-muted-foreground">Issuer</dt>
                  <dd className="col-span-2">{result.cert.issuer ?? "—"}</dd>
                  <dt className="text-muted-foreground">Issue date</dt>
                  <dd className="col-span-2">{formatDate(result.cert.issued_at)}</dd>
                  <dt className="text-muted-foreground">Uploaded</dt>
                  <dd className="col-span-2">{new Date(result.cert.created_at).toLocaleString()}</dd>
                  <dt className="text-muted-foreground">File size</dt>
                  <dd className="col-span-2">{formatBytes(result.cert.file_size)}</dd>
                  <dt className="text-muted-foreground">SHA-256</dt>
                  <dd className="col-span-2 break-all font-mono text-xs">{result.cert.file_hash}</dd>
                </dl>

                <div className="flex flex-wrap gap-2">
                  {result.cert.file_hash && (
                    <Button size="sm" variant="outline" onClick={() => copy(result.cert.file_hash!, "SHA-256 fingerprint")}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy hash
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => copy(verifiedUrl, "Verification link")}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                  </Button>
                  {result.previewUrl && (
                    <Button size="sm" onClick={() => window.open(result.previewUrl!, "_blank", "noopener,noreferrer")}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> View file
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {result.state === "not_found" && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Credential not found</AlertTitle>
              <AlertDescription>No verified credential matches that ID or fingerprint.</AlertDescription>
            </Alert>
          )}

          {result.state === "error" && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Verification failed</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
