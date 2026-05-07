import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw, Trash2, Upload, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ACCEPTED_EXTENSIONS = /\.(pdf|docx)$/i;
const MAX_BYTES = 10 * 1024 * 1024;

type Resume = {
  id: string;
  title: string;
  status: "uploading" | "pending" | "processing" | "completed" | "failed" | string;
  ats_score: number | null;
  trust_score: number | null;
  processing_error: string | null;
  file_hash: string | null;
  file_url: string | null;
  created_at: string;
};

type UploadState = {
  id: string;
  fileName: string;
  progress: number;
  stage: "uploading" | "processing" | "completed" | "failed";
  message: string;
  error?: string;
  resumeId?: string;
};

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseJsonResponse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Unexpected server response." };
  }
}

function validateResumeFile(file: File) {
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXTENSIONS.test(file.name)) {
    return "Only PDF and DOCX files are supported.";
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_BYTES) return "Resume files must be 10MB or smaller.";
  return null;
}

function statusBadgeVariant(status: string) {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

export default function Resumes() {
  const { user, session } = useAuth();
  const [items, setItems] = useState<Resume[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRetry, setActiveRetry] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const activeHashes = useRef(new Set<string>());

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("resumes")
      .select("id,title,status,ats_score,trust_score,processing_error,file_hash,file_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setItems([]);
    } else {
      setItems((data as Resume[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const updateUpload = (id: string, patch: Partial<UploadState>) => {
    setUploads((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeUploadLater = (id: string) => {
    window.setTimeout(() => {
      setUploads((current) => current.filter((item) => item.id !== id));
    }, 2600);
  };

  const uploadWithProgress = (file: File, uploadId: string) =>
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

      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      xhr.open("POST", `${baseUrl}/functions/v1/upload-resume`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateUpload(uploadId, {
          progress: Math.max(8, Math.min(82, Math.round((event.loaded / event.total) * 82))),
          message: "Uploading securely…",
        });
      };
      xhr.onload = () => {
        const payload = parseJsonResponse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new Error(payload.error || "Resume upload failed."));
      };
      xhr.onerror = () => reject(new Error("Network error during resume upload."));
      xhr.onabort = () => reject(new Error("Resume upload was cancelled."));
      xhr.send(form);
    });

  const analyzeResume = async (resumeId: string) => {
    if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${baseUrl}/functions/v1/analyze-resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resumeId }),
    });
    const payload = parseJsonResponse(await response.text());
    if (!response.ok) throw new Error(payload.error || "ATS analysis failed.");
    return payload;
  };

  const processFile = async (file: File) => {
    const validationError = validateResumeFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const uploadId = crypto.randomUUID();
    setUploads((current) => [
      ...current,
      { id: uploadId, fileName: file.name, progress: 4, stage: "uploading", message: "Preparing file…" },
    ]);

    let hash = "";
    let resumeId = "";
    try {
      hash = await sha256Hex(file);
      if (activeHashes.current.has(hash) || items.some((item) => item.file_hash === hash && item.status !== "failed")) {
        throw new Error("This resume has already been uploaded or is currently processing.");
      }
      activeHashes.current.add(hash);

      updateUpload(uploadId, { progress: 10, message: "Uploading securely…" });
      const uploadPayload = await uploadWithProgress(file, uploadId);
      resumeId = uploadPayload.resume?.id;
      if (!resumeId) throw new Error("Upload completed but no resume record was returned.");

      updateUpload(uploadId, {
        resumeId,
        stage: "processing",
        progress: 88,
        message: "Parsing resume and running ATS analysis…",
      });
      await load();
      await analyzeResume(resumeId);
      updateUpload(uploadId, {
        stage: "completed",
        progress: 100,
        message: "ATS analysis completed.",
      });
      toast.success("Resume analyzed successfully");
      await load();
      removeUploadLater(uploadId);
    } catch (error: any) {
      const message = error?.message ?? "Resume upload failed.";
      updateUpload(uploadId, { stage: "failed", progress: 100, message: "Upload failed", error: message, resumeId });
      toast.error(message);
      await load();
    } finally {
      if (hash) activeHashes.current.delete(hash);
    }
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    for (const file of files) await processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const retryAnalysis = async (resumeId: string) => {
    setActiveRetry(resumeId);
    try {
      await analyzeResume(resumeId);
      toast.success("Analysis completed");
      await load();
    } catch (error: any) {
      toast.error(error?.message ?? "Retry failed");
      await load();
    } finally {
      setActiveRetry(null);
    }
  };

  const onDelete = async (r: Resume) => {
    if (!confirm("Delete this resume and its analysis?")) return;
    if (r.file_url) await supabase.storage.from("resumes").remove([r.file_url]);
    const { error } = await supabase.from("resumes").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else toast.success("Resume deleted");
    await load();
  };

  const isWorking = uploads.some((upload) => upload.stage === "uploading" || upload.stage === "processing") || !!activeRetry;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Upload PDF or DOCX files for parsing, ATS scoring, skill extraction, and trust analysis.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={isWorking}>
          {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload resume
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <Card
        className={cn(
          "border-2 border-dashed bg-muted/20 transition-all duration-200",
          dragging ? "border-primary bg-primary/5 shadow-glow" : "border-border/80",
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
          setDragging(true);
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
          handleFiles(e.dataTransfer.files);
        }}
      >
        <CardContent className="flex min-h-56 flex-col items-center justify-center py-12 text-center">
          <div className={cn("mb-4 grid h-14 w-14 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow", dragging && "animate-pulse")}>
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="font-display text-lg font-semibold">Drop resumes here</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            PDF or DOCX only, up to 10MB each. Duplicate files are blocked before processing.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => inputRef.current?.click()} disabled={isWorking}>
            Choose files
          </Button>
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <Card key={upload.id} className="overflow-hidden">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  {upload.stage === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : upload.stage === "failed" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{upload.fileName}</div>
                    <div className="text-xs text-muted-foreground">{upload.error ?? upload.message}</div>
                  </div>
                  {upload.resumeId && upload.stage === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => retryAnalysis(upload.resumeId!)} disabled={activeRetry === upload.resumeId}>
                      {activeRetry === upload.resumeId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      Retry
                    </Button>
                  )}
                </div>
                <Progress value={upload.progress} className="mt-3 h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your resumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No resumes yet.</p>
          )}
          {!loading && items.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="w-40">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>ATS</span>
                    <span className="text-muted-foreground">{r.ats_score ?? "—"}</span>
                  </div>
                  <Progress value={r.ats_score ?? 0} className="h-2" />
                </div>
                <Badge variant={statusBadgeVariant(r.status) as any}>{r.status}</Badge>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/dashboard/resumes/${r.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Link>
                  </Button>
                  {r.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => retryAnalysis(r.id)} disabled={activeRetry === r.id}>
                      {activeRetry === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      Retry
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {r.status === "failed" && r.processing_error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Analysis failed</AlertTitle>
                  <AlertDescription>{r.processing_error}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
