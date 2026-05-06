import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

type Resume = {
  id: string;
  title: string;
  status: string;
  ats_score: number | null;
  trust_score: number | null;
  created_at: string;
};

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 10 * 1024 * 1024;

export default function Resumes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Resume[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("resumes")
      .select("id,title,status,ats_score,trust_score,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Resume[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const onUpload = async (file: File) => {
    if (!user) return;
    if (!ACCEPTED.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
      toast.error("Only PDF or DOCX files are supported.");
      return;
    }
    if (file.size === 0) return toast.error("File is empty.");
    if (file.size > MAX_BYTES) return toast.error("Max file size is 10MB.");

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          title: file.name.replace(/\.[^.]+$/, ""),
          file_url: path,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      toast.success("Uploaded. Running AI analysis…");
      await load();

      const { error: fnErr } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId: row.id },
      });
      if (fnErr) throw fnErr;
      toast.success("Analysis complete");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (r: Resume) => {
    if (!confirm("Delete this resume?")) return;
    await supabase.from("resumes").delete().eq("id", r.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Upload PDF or DOCX. AI will run ATS scoring, extract skills, and surface trust signals.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? "Processing…" : "Upload resume"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </div>

      <Card
        className="border-dashed border-2 border-border/80 bg-muted/20"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onUpload(f);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
            <Upload className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-semibold">Drag & drop your resume</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            PDF or DOCX, up to 10MB. Your file is private and stored securely.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your resumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No resumes yet.</p>
          )}
          {items.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 p-4"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="w-40">
                <div className="mb-1 flex justify-between text-xs">
                  <span>ATS</span>
                  <span className="text-muted-foreground">{r.ats_score ?? "—"}</span>
                </div>
                <Progress value={r.ats_score ?? 0} />
              </div>
              <Badge
                variant={
                  r.status === "completed"
                    ? "default"
                    : r.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {r.status}
              </Badge>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/dashboard/resumes/${r.id}`}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
