import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; cert: any }
  | { state: "not_found" };

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("hash") ?? "");
  const [result, setResult] = useState<Result>({ state: "idle" });

  const verify = async (hash: string) => {
    if (!hash.trim()) return;
    setResult({ state: "loading" });
    const { data } = await supabase
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,verified,created_at")
      .eq("file_hash", hash.trim().toLowerCase())
      .eq("verified", true)
      .maybeSingle();
    setResult(data ? { state: "found", cert: data } : { state: "not_found" });
  };

  useEffect(() => {
    const h = params.get("hash");
    if (h) verify(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-tight py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Verify a credential
        </h1>
        <p className="mt-4 text-muted-foreground">
          Paste a SHA-256 credential fingerprint to confirm authenticity.
        </p>
      </div>
      <Card className="mx-auto mt-12 max-w-2xl">
        <CardHeader>
          <CardTitle>Verification explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ hash: q });
              verify(q);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 font-mono text-xs"
                placeholder="sha256 fingerprint"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button type="submit">Verify</Button>
          </form>

          {result.state === "loading" && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </div>
          )}
          {result.state === "found" && (
            <div className="rounded-lg border border-success/40 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-medium">Credential verified</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="col-span-2">{result.cert.title}</dd>
                <dt className="text-muted-foreground">Issuer</dt>
                <dd className="col-span-2">{result.cert.issuer ?? "—"}</dd>
                <dt className="text-muted-foreground">Issued</dt>
                <dd className="col-span-2">{result.cert.issued_at ?? "—"}</dd>
                <dt className="text-muted-foreground">Recorded</dt>
                <dd className="col-span-2">{new Date(result.cert.created_at).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Hash</dt>
                <dd className="col-span-2 break-all font-mono text-xs">{result.cert.file_hash}</dd>
              </dl>
            </div>
          )}
          {result.state === "not_found" && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              No verified credential matches that fingerprint.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
