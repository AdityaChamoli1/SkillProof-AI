import { useEffect, useMemo, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileImage,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ACCEPTED_EXTENSIONS = /\.(pdf|png|jpe?g|webp)$/i;
const CACHE_PREFIX = "skillproof.credentials";

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
  local_preview_url?: string;
  source?: "cloud" | "local";
};

type UploadState = {
  fileName: string;
  progress: number;
  stage: "uploading" | "completed" | "failed";
  message: string;
  error?: string;
  fingerprint?: string;
};

type PreviewState = {
  cert: Cert;
  url: string;
  loading: boolean;
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
    return "Invalid file type. Upload a PDF, PNG, JPG, JPEG, or WEBP certificate.";
  }
  if (file.size === 0) return "The selected certificate file is empty.";
  if (file.size > MAX_BYTES) return "File too large. Certificates must be 15MB or smaller.";
  return null;
}

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "No issue date";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isImage(cert: Cert) {
  return Boolean(cert.content_type?.startsWith("image/"));
}

function isPdf(cert: Cert) {
  return cert.content_type === "application/pdf" || cert.file_url?.toLowerCase().endsWith(".pdf");
}

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}.${userId}`;
}

function readCachedCredentials(userId: string): Cert[] {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || "[]");
  } catch {
    return [];
  }
}

function writeCachedCredentials(userId: string, credentials: Cert[]) {
  localStorage.setItem(cacheKey(userId), JSON.stringify(credentials.slice(0, 50)));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not create a local certificate preview."));
    reader.readAsDataURL(file);
  });
}

function publicCredentialUrl(cert: Cert) {
  return `${window.location.origin}/verify/${cert.id}`;
}

export default function Certificates() {
  const { user, session } = useAuth();
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [items],
  );

  const signPreviewUrls = async (credentials: Cert[]) => {
    const next: Record<string, string> = {};
    await Promise.all(
      credentials.map(async (cert) => {
        if (!cert.file_url) {
          if (cert.local_preview_url) next[cert.id] = cert.local_preview_url;
          return;
        }
        const { data, error } = await supabase.storage.from("certificates").createSignedUrl(cert.file_url, 60 * 30);
        if (!error && data?.signedUrl) next[cert.id] = data.signedUrl;
      }),
    );
    setPreviewUrls(next);
  };

  const load = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("certificates")
      .select("id,title,issuer,issued_at,file_hash,file_url,verified,created_at,content_type,file_size")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("credentials load failed", error);
      const cached = readCachedCredentials(user.id);
      setItems(cached);
      toast.error("Could not refresh credentials", { description: error.message });
      await signPreviewUrls(cached);
    } else {
      const credentials = ((data as Cert[]) ?? []).map((cert) => ({ ...cert, source: "cloud" as const }));
      console.debug("credentials", credentials);
      setItems(credentials);
      writeCachedCredentials(user.id, credentials);
      await signPreviewUrls(credentials);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const uploadWithProgress = (file: File, fingerprint: string) =>
    new Promise<{ certificate?: Cert }>((resolve, reject) => {
      if (!session?.access_token) {
        reject(new Error("Your session expired. Please sign in again."));
        return;
      }
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!baseUrl || !anonKey) {
        reject(new Error("Credential upload service is not configured."));
        return;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("issuer", issuer.trim());
      form.append("issued_at", issuedAt);
      form.append("client_hash", fingerprint);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/functions/v1/upload-certificate`);
      xhr.timeout = 120_000;
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setUploadState((current) =>
          current
            ? {
                ...current,
                progress: Math.max(12, Math.min(92, Math.round((event.loaded / event.total) * 92))),
                message: "Uploading certificate to secure storage…",
              }
            : current,
        );
      };
      xhr.onload = () => {
        const payload = parseJsonResponse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new Error(payload.error || `Certificate upload failed with status ${xhr.status}.`));
      };
      xhr.onerror = () => reject(new Error("Network error during certificate upload."));
      xhr.ontimeout = () => reject(new Error("Certificate upload timed out. Please retry."));
      xhr.onabort = () => reject(new Error("Certificate upload was cancelled."));
      xhr.send(form);
    });

  const saveLocalFallback = async (file: File, fingerprint: string): Promise<Cert | null> => {
    if (!user || file.size > 2 * 1024 * 1024) return null;
    const localUrl = await fileToDataUrl(file);
    const localCredential: Cert = {
      id: crypto.randomUUID(),
      title: title.trim(),
      issuer: issuer.trim() || null,
      issued_at: issuedAt || null,
      file_hash: fingerprint,
      file_url: null,
      verified: true,
      content_type: file.type || null,
      file_size: file.size,
      created_at: new Date().toISOString(),
      local_preview_url: localUrl,
      source: "local",
    };
    const next = [localCredential, ...items];
    setItems(next);
    writeCachedCredentials(user.id, next);
    setPreviewUrls((current) => ({ ...current, [localCredential.id]: localUrl }));
    return localCredential;
  };

  const handleFileUpload = async (file?: File | null) => {
    if (!file || busy) return;
    console.debug("credential file", file);

    if (!title.trim()) {
      toast.error("Add a credential title first");
      return;
    }

    const validationError = validateCertificateFile(file);
    if (validationError) {
      toast.error(validationError);
      setUploadState({ fileName: file.name, progress: 100, stage: "failed", message: "Validation failed", error: validationError });
      setLastFailedFile(file);
      return;
    }

    setBusy(true);
    setLastFailedFile(null);
    setUploadState({ fileName: file.name, progress: 6, stage: "uploading", message: "Generating SHA-256 fingerprint…" });

    try {
      const fingerprint = await sha256Hex(file);
      setUploadState({ fileName: file.name, progress: 16, stage: "uploading", message: "Fingerprint generated. Starting upload…", fingerprint });

      const payload = await uploadWithProgress(file, fingerprint);
      const uploadedCredential = payload.certificate as Cert | undefined;
      console.debug("uploadedCredential", uploadedCredential);

      if (!uploadedCredential?.id) throw new Error("Upload completed, but no credential record was returned.");

      const credential: Cert = { ...uploadedCredential, source: "cloud" };
      setItems((current) => {
        const next = [credential, ...current.filter((item) => item.id !== credential.id)];
        console.debug("credentials", next);
        if (user) writeCachedCredentials(user.id, next);
        return next;
      });
      await signPreviewUrls([credential]);
      setUploadState({ fileName: file.name, progress: 100, stage: "completed", message: "Certificate uploaded successfully.", fingerprint });
      toast.success("Certificate uploaded successfully", { description: "SHA-256 fingerprint generated and saved." });
      setTitle("");
      setIssuer("");
      setIssuedAt("");
      await load();
      window.setTimeout(() => setUploadState(null), 2800);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Certificate upload failed.";
      console.error("certificate upload failed", error);
      const fingerprint = uploadState?.fingerprint ?? (await sha256Hex(file).catch(() => undefined));
      let fallbackMessage = message;
      if (fingerprint) {
        const fallback = await saveLocalFallback(file, fingerprint);
        if (fallback) fallbackMessage = `${message} Saved a local fallback copy in this browser.`;
      }
      setLastFailedFile(file);
      setUploadState({ fileName: file.name, progress: 100, stage: "failed", message: "Upload failed", error: fallbackMessage, fingerprint });
      toast.error("Certificate upload failed", { description: fallbackMessage });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openPreview = async (cert: Cert) => {
    const existing = previewUrls[cert.id] || cert.local_preview_url;
    setPreview({ cert, url: existing ?? "", loading: !existing });

    if (existing) return;
    if (!cert.file_url) {
      setPreview({ cert, url: "", loading: false, error: "This credential has no stored file to preview." });
      return;
    }

    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(cert.file_url, 60 * 15);
    if (error || !data?.signedUrl) {
      const message = error?.message ?? "Could not generate preview.";
      setPreview({ cert, url: "", loading: false, error: message });
      toast.error(message);
      return;
    }
    setPreviewUrls((current) => ({ ...current, [cert.id]: data.signedUrl }));
    setPreview({ cert, url: data.signedUrl, loading: false });
  };

  const downloadFile = async (cert: Cert) => {
    const signedUrl = previewUrls[cert.id] || cert.local_preview_url;
    if (!signedUrl && !cert.file_url) return toast.error("Certificate file is missing.");

    let url = signedUrl;
    if (!url && cert.file_url) {
      const { data, error } = await supabase.storage.from("certificates").createSignedUrl(cert.file_url, 60 * 5);
      if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not download certificate");
      url = data.signedUrl;
    }

    const extension = cert.file_url?.split(".").pop() || (isPdf(cert) ? "pdf" : "certificate");
    const anchor = document.createElement("a");
    anchor.href = url!;
    anchor.download = `${cert.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "credential"}.${extension}`;
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const deleteCredential = async (cert: Cert) => {
    if (!confirm("Delete this certificate and its verification record?")) return;

    if (cert.source === "local") {
      const next = items.filter((item) => item.id !== cert.id);
      setItems(next);
      if (user) writeCachedCredentials(user.id, next);
      toast.success("Local credential deleted");
      return;
    }

    if (cert.file_url) {
      const { error: storageError } = await supabase.storage.from("certificates").remove([cert.file_url]);
      if (storageError) toast.error("File delete warning", { description: storageError.message });
    }

    const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
    if (error) {
      toast.error("Could not delete credential", { description: error.message });
      return;
    }

    const next = items.filter((item) => item.id !== cert.id);
    setItems(next);
    if (user) writeCachedCredentials(user.id, next);
    toast.success("Certificate deleted");
  };

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Upload credentials, generate SHA-256 fingerprints, preview files, and share public verification links.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Issue a new credential</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title</Label>
              <Input id="ct" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AWS Solutions Architect" maxLength={180} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci">Issuer</Label>
              <Input id="ci" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Amazon Web Services" maxLength={180} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">Issued on</Label>
              <Input id="cd" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} disabled={busy} />
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload certificate file"
            className={cn(
              "group rounded-lg border-2 border-dashed border-border/80 bg-muted/20 p-8 text-center outline-none transition-all duration-300 hover:border-primary/70 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              dragging && "scale-[1.01] border-primary bg-primary/10 shadow-glow",
              busy && "pointer-events-none opacity-75",
            )}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
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
              handleFileUpload(file);
            }}
          >
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow transition-transform duration-300 group-hover:-translate-y-0.5">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </div>
            <h3 className="font-display text-base font-semibold">Drop a certificate file</h3>
            <p className="mt-1 text-sm text-muted-foreground">PDF, PNG, JPG, JPEG, or WEBP. Maximum 15MB.</p>
            <Button
              type="button"
              className="mt-5"
              onClick={(e) => {
                e.stopPropagation();
                if (inputRef.current) inputRef.current.value = "";
                inputRef.current?.click();
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {busy ? "Uploading…" : "Choose certificate"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onClick={(e) => {
                e.currentTarget.value = "";
              }}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
          </div>

          {uploadState && (
            <Alert variant={uploadState.stage === "failed" ? "destructive" : "default"} className="animate-fade-up">
              {uploadState.stage === "completed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : uploadState.stage === "failed" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <AlertTitle>{uploadState.fileName}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{uploadState.error ?? uploadState.message}</p>
                {uploadState.fingerprint && (
                  <button
                    type="button"
                    onClick={() => copyText(uploadState.fingerprint!, "SHA-256 fingerprint")}
                    className="block max-w-full truncate rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    SHA-256: {uploadState.fingerprint}
                  </button>
                )}
                <Progress value={uploadState.progress} className="h-2" />
                {uploadState.stage === "failed" && lastFailedFile && (
                  <Button type="button" size="sm" variant="outline" onClick={() => handleFileUpload(lastFailedFile)} disabled={busy}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry upload
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Your credentials</CardTitle>
          <Badge variant="secondary">{sortedItems.length} saved</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          )}

          {!loading && sortedItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-background shadow-sm">
                <BadgeCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-base font-semibold">No credentials yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Upload your first certificate to create a verified credential card with a fingerprint and public proof link.
              </p>
            </div>
          )}

          {!loading && sortedItems.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {sortedItems.map((cert) => {
                const previewUrl = previewUrls[cert.id] || cert.local_preview_url;
                return (
                  <Card key={cert.id} className="overflow-hidden border-border/60 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card">
                    <div className="grid min-h-56 sm:grid-cols-[168px_1fr]">
                      <button
                        type="button"
                        onClick={() => openPreview(cert)}
                        className="relative min-h-40 overflow-hidden bg-muted/40 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-full"
                      >
                        {previewUrl && isImage(cert) ? (
                          <img src={previewUrl} alt={`${cert.title} certificate preview`} className="h-full w-full object-cover" loading="lazy" />
                        ) : previewUrl && isPdf(cert) ? (
                          <iframe title={`${cert.title} PDF preview`} src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="h-full w-full bg-background" />
                        ) : (
                          <div className="grid h-full min-h-40 place-items-center">
                            {isImage(cert) ? <FileImage className="h-10 w-10 text-muted-foreground" /> : <FileText className="h-10 w-10 text-muted-foreground" />}
                          </div>
                        )}
                        <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium backdrop-blur">
                          {isPdf(cert) ? "PDF" : cert.content_type?.split("/")[1]?.toUpperCase() || "FILE"}
                        </div>
                      </button>

                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{cert.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {cert.issuer ?? "Unknown issuer"} • {formatDate(cert.issued_at)} • {formatBytes(cert.file_size)}
                            </div>
                          </div>
                          <Badge variant={cert.verified ? "default" : "secondary"}>{cert.verified ? "Verified" : "Pending"}</Badge>
                        </div>

                        {cert.file_hash ? (
                          <button
                            type="button"
                            onClick={() => copyText(cert.file_hash!, "SHA-256 fingerprint")}
                            className="block w-full truncate rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            SHA-256: {cert.file_hash} <Copy className="ml-1 inline h-3 w-3" />
                          </button>
                        ) : (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Missing fingerprint</AlertTitle>
                            <AlertDescription>This certificate needs to be re-uploaded.</AlertDescription>
                          </Alert>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openPreview(cert)}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadFile(cert)}>
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                          </Button>
                          {cert.source !== "local" && cert.file_hash ? (
                            <Button size="sm" variant="outline" onClick={() => copyText(publicCredentialUrl(cert), "Public verification link")}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Share
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={() => deleteCredential(cert)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          {preview && (
            <>
              <DialogHeader className="border-b border-border/70 p-5 pr-12">
                <DialogTitle>{preview.cert.title}</DialogTitle>
                <DialogDescription>
                  {preview.cert.issuer ?? "Unknown issuer"} • {formatDate(preview.cert.issued_at)} • SHA-256 verified
                </DialogDescription>
              </DialogHeader>
              <div className="h-[70vh] bg-muted/30">
                {preview.loading && (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    <Loader2 className="mb-2 h-5 w-5 animate-spin" /> Loading preview…
                  </div>
                )}
                {preview.error && (
                  <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
                    <AlertCircle className="mb-2 h-6 w-6 text-destructive" /> {preview.error}
                  </div>
                )}
                {!preview.loading && !preview.error && isImage(preview.cert) && (
                  <img src={preview.url} alt={`${preview.cert.title} certificate`} className="h-full w-full object-contain" />
                )}
                {!preview.loading && !preview.error && isPdf(preview.cert) && (
                  <iframe title={`${preview.cert.title} PDF`} src={preview.url} className="h-full w-full bg-background" />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4">
                <code className="max-w-full truncate text-xs text-muted-foreground">{preview.cert.file_hash}</code>
                <div className="flex gap-2">
                  {preview.cert.file_hash && (
                    <Button size="sm" variant="outline" onClick={() => copyText(preview.cert.file_hash!, "SHA-256 fingerprint")}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy hash
                    </Button>
                  )}
                  <Button size="sm" onClick={() => downloadFile(preview.cert)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
