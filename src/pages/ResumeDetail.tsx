import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Skill = { name: string; category: string; confidence: number };
type Suggestion = { title: string; detail: string; severity: "low" | "medium" | "high" };

export default function ResumeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("resumes").select("*").eq("id", id).maybeSingle();
    setResume(data);
  };
  useEffect(() => {
    load();
  }, [id]);

  const reanalyze = async () => {
    if (!id) return;
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId: id },
      });
      if (error) throw error;
      toast.success("Re-analyzed");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setRunning(false);
    }
  };

  if (!resume) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const skills: Skill[] = Array.isArray(resume.skills) ? resume.skills : [];
  const sugg = resume.ai_suggestions || {};
  const suggestions: Suggestion[] = sugg.suggestions ?? [];
  const missing: string[] = sugg.missing_keywords ?? [];
  const strengths: string[] = sugg.strengths ?? [];

  const sevColor = (s: string) =>
    s === "high" ? "destructive" : s === "medium" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link to="/dashboard/resumes">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{resume.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(resume.created_at).toLocaleString()} · Status:{" "}
            <Badge variant="secondary">{resume.status}</Badge>
          </p>
        </div>
        <Button onClick={reanalyze} disabled={running} variant="outline">
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-analyze
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> ATS Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl font-semibold">{resume.ats_score ?? "—"}</div>
            <Progress value={resume.ats_score ?? 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" /> Trust Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl font-semibold">{resume.trust_score ?? "—"}</div>
            <Progress value={resume.trust_score ?? 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Skills detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl font-semibold">{skills.length}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Across technical, soft, and tools.
            </p>
          </CardContent>
        </Card>
      </div>

      {resume.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{resume.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills extracted yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s.name} variant="secondary" className="gap-1.5">
                  {s.name}
                  <span className="text-xs text-muted-foreground">{s.confidence}%</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strengths & gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Strengths
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
                {strengths.length === 0 && <li className="list-none text-muted-foreground">—</li>}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Missing keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
                {missing.length === 0 && <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">No suggestions yet.</p>
          )}
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="font-medium">{s.title}</div>
                <Badge variant={sevColor(s.severity) as any}>{s.severity}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
