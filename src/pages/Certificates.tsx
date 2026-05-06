import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Trash2, ShieldCheck, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Cert = {
  id: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  file_hash: string | null;
  file_url: string | null;
  verified: boolean;
  created_at: string;
};

const MAX_BYTES = 15 * 1024 * 1024;

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Certificates() {
  const { user } = useAuth();
  const [items, setItems] = useState<Cert[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Cert[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const onUpload = async (file: File) => {
    if (!user) return;
    if (!title.trim()) return toast.error("Add a credential title first");
    if (file.size === 0) return toast.error("File is empty.");
    if (file.size > MAX_BYTES) return toast.error("Max file size is 15MB.");

    setBusy(true);
    try {
      const hash = await sha256Hex(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("certificates")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("certificates").insert({
        user_id: user.id,
        title: title.trim(),
        issuer: issuer.trim() || null,
        issued_at: issuedAt || null,
        file_url: path,
        file_hash: hash,
        verified: true,
      });
      if (insErr) throw insErr;

      toast.success("Certificate hashed & saved");
      setTitle("");
      setIssuer("");
      setIssuedAt("");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (c: Cert) => {
    if (!confirm("Delete this certificate?")) return;
    if (c.file_url) await supabase.storage.from("certificates").remove([c.file_url]);
    await supabase.from("certificates").delete().eq("id", c.id);
    await load();
  };

  const copyHash = (h: string) => {
    navigator.clipboard.writeText(h);
    toast.success("Hash copied");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Upload credentials. We compute a SHA-256 fingerprint anyone can use to verify authenticity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issue a new credential</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ct">Title</Label>
            <Input id="ct" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AWS Solutions Architect" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci">Issuer</Label>
            <Input id="ci" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Amazon Web Services" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd">Issued on</Label>
            <Input id="cd" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {busy ? "Hashing & uploading…" : "Upload certificate file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No credentials yet.</p>
          )}
          {items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 p-4">
              <ShieldCheck className="h-5 w-5 text-success" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {c.issuer ?? "Unknown issuer"} • {c.issued_at ?? "no date"}
                </div>
                {c.file_hash && (
                  <button
                    onClick={() => copyHash(c.file_hash!)}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {c.file_hash.slice(0, 16)}…<Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Badge variant={c.verified ? "default" : "secondary"}>
                {c.verified ? "Verified" : "Pending"}
              </Badge>
              <Button asChild size="sm" variant="outline">
                <a href={`/verify?hash=${c.file_hash}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Public link
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(c)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
