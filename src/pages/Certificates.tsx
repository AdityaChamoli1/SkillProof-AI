import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Eye, FileCheck2, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ACCEPTED_EXTENSIONS = /\.(pdf|png|jpe?g|webp)$/i;

type Cert = {
  id: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  file_hash: string | null;
  file_url: string | null;
  verified: boolean;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
};

type UploadState = {
  fileName: string;
  progress: number;
  stage: "uploading" | "completed" | "failed";
  message: string;
  error?: string;
};

function parseJsonResponse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Unexpected server response." };
  }
}

function validateCertificateFile(file: File) {
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXTENSIONS.test(file.name)) {
    return "Certificates must be PDF, PNG, JPG, or WEBP files.";
  }
  if (file.size === 0) return "The selected certificate file is empty.";
  if (file.size > MAX_BYTES) return "Certificate files must be 15MB or smaller.";
  return null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Certificates() {
  const { user, session } = useAuth();
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at,content_type,file_size")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setItems([]);
    } else {
      setItems((data as Cert[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const uploadWithProgress = (file: File) =>
    new Promise<any>((resolve, reject) => {
      if (!session?.access_token) {
        reject(new Error("Your session expired. Please sign in again."));
        return;
      }
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) {
        reject(new Error("Upload service is not configured."));
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("issuer", issuer.trim());
      form.append("issued_at", issuedAt);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/functions/v1/upload-certificate`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setUploadState((current) =>
          current ? { ...current, progress: Math.max(8, Math.min(90, Math.round((event.loaded / event.total) * 90))), message: "Uploading and hashing…" } : current,
        );
      };
      xhr.onload = () => {
        const payload = parseJsonResponse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new Error(payload.error || "Certificate upload failed."));
      };
      xhr.onerror = () => reject(new Error("Network error during certificate upload."));
      xhr.send(form);
    });

  const onUpload = async (file: File) => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Add a credential title first");
      return;
    }
    const validationError = validateCertificateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setBusy(true);
    setUploadState({ fileName: file.name, progress: 5, stage: "uploading", message: "Preparing certificate…" });
    try {
      await uploadWithProgress(file);
      setUploadState({ fileName: file.name, progress: 100, stage: "completed", message: "Certificate verified and saved." });
      toast.success("Certificate uploaded and fingerprinted");
      setTitle("");
      setIssuer("");
      setIssuedAt("");
      await load();
      window.setTimeout(() => setUploadState(null), 2600);
    } catch (error: any) {
      const message = error?.message ?? "Certificate upload failed";
      setUploadState({ fileName: file.name, progress: 100, stage: "failed", message: "Upload failed", error: message });
      toast.error(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openPreview = async (c: Cert) => {
    if (!c.file_url) return toast.error("Certificate file is missing.");
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(c.file_url, 60 * 5);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not open preview");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const onDelete = async (c: Cert) => {
    if (!confirm("Delete this certificate and its verification record?")) return;
    if (c.file_url) await supabase.storage.from("certificates").remove([c.file_url]);
    const { error } = await supabase.from("certificates").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success("Certificate deleted");
    await load();
  };

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    toast.success("Hash copied");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Upload credentials, generate SHA-256 fingerprints, preview files, and share public verification links.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issue a new credential</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title</Label>
              <Input id="ct" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AWS Solutions Architect" maxLength={180} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci">Issuer</Label>
              <Input id="ci" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Amazon Web Services" maxLength={180} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">Issued on</Label>
              <Input id="cd" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border-2 border-dashed border-border/80 bg-muted/20 p-8 text-center transition-all",
              dragging && "border-primary bg-primary/5 shadow-glow",
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (dragDepth.current === 0) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragDepth.current = 0;
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onUpload(file);
            }}
          >
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-semibold">Drop a certificate file</h3>
            <p className="mt-1 text-sm text-muted-foreground">PDF, PNG, JPG, or WEBP. Maximum 15MB.</p>
            <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {busy ? "Uploading…" : "Choose certificate"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </div>

          {uploadState && (
            <Alert variant={uploadState.stage === "failed" ? "destructive" : "default"}>
              {uploadState.stage === "completed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : uploadState.stage === "failed" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <AlertTitle>{uploadState.fileName}</AlertTitle>
              <AlertDescription>
                {uploadState.error ?? uploadState.message}
                <Progress value={uploadState.progress} className="mt-3 h-2" />
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          )}
          {!loading && items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No credentials yet.</p>}
          {!loading && items.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((c) => (
                <Card key={c.id} className="border-border/60 shadow-none">
                  <CardContent className="space-y-4 py-4">
                    <div className="flex items-start gap-3">
                      <FileCheck2 className="mt-0.5 h-5 w-5 text-success" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.issuer ?? "Unknown issuer"} • {c.issued_at ?? "no date"} • {formatBytes(c.file_size)}
                        </div>
                      </div>
                      <Badge variant={c.verified ? "default" : "secondary"}>{c.verified ? "Verified" : "Pending"}</Badge>
                    </div>

                    {c.file_hash ? (
                      <button
                        onClick={() => copyHash(c.file_hash!)}
                        className="block w-full truncate rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {c.file_hash} <Copy className="ml-1 inline h-3 w-3" />
                      </button>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Missing fingerprint</AlertTitle>
                        <AlertDescription>This certificate needs to be re-uploaded.</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPreview(c)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                      </Button>
                      <Button asChild size="sm" variant="outline" disabled={!c.file_hash}>
                        <a href={`/verify?hash=${c.file_hash}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Public link
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
