import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Lock } from "lucide-react";

type Row = {
  id: string;
  title: string;
  ats_score: number | null;
  trust_score: number | null;
  skills: any;
  ai_summary: string | null;
  user_id: string;
  created_at: string;
};

export default function Recruiters() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [minAts, setMinAts] = useState(0);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const ok = roles?.some((r) => r.role === "recruiter" || r.role === "admin") ?? false;
      setAllowed(ok);
      if (!ok) return;
      const { data } = await supabase
        .from("resumes")
        .select("id,title,ats_score,trust_score,skills,ai_summary,user_id,created_at")
        .eq("status", "completed")
        .order("ats_score", { ascending: false })
        .limit(200);
      setRows((data as Row[]) ?? []);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if ((r.ats_score ?? 0) < minAts) return false;
      if (!term) return true;
      const skillNames = Array.isArray(r.skills)
        ? r.skills.map((s: any) => s.name?.toLowerCase()).join(" ")
        : "";
      const blob = `${r.title} ${r.ai_summary ?? ""} ${skillNames}`.toLowerCase();
      return blob.includes(term);
    });
  }, [rows, q, minAts]);

  if (allowed === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Recruiter access required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your account doesn't have the recruiter role. Contact an admin to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Recruiter Hub</h1>
        <p className="text-sm text-muted-foreground">
          Search verified candidates by skills, role, or ATS score.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by skill, role, summary…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Min ATS</span>
            <Input
              type="number"
              min={0}
              max={100}
              className="w-20"
              value={minAts}
              onChange={(e) => setMinAts(Number(e.target.value) || 0)}
            />
          </div>
          <div className="text-sm text-muted-foreground">{filtered.length} results</div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filtered.map((r) => {
          const skills = Array.isArray(r.skills) ? r.skills.slice(0, 6) : [];
          return (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.title}</div>
                  {r.ai_summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.ai_summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((s: any) => (
                      <Badge key={s.name} variant="secondary">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="w-44">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>ATS</span>
                    <span className="text-muted-foreground">{r.ats_score ?? "—"}</span>
                  </div>
                  <Progress value={r.ats_score ?? 0} />
                  <div className="mb-1 mt-3 flex justify-between text-xs">
                    <span>Trust</span>
                    <span className="text-muted-foreground">{r.trust_score ?? "—"}</span>
                  </div>
                  <Progress value={r.trust_score ?? 0} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No candidates match these filters yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
