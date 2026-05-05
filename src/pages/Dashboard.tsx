import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, Sparkles, TrendingUp, Upload } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [counts, setCounts] = useState({ resumes: 0, certs: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { count: rc }, { count: cc }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("resumes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setName(profile?.full_name || user.email?.split("@")[0] || "there");
      setCounts({ resumes: rc ?? 0, certs: cc ?? 0 });
    })();
  }, [user]);

  const stats = [
    { label: "ATS Score", value: 0, sub: "Upload a resume", icon: Sparkles, color: "text-primary" },
    { label: "Trust Grade", value: "—", sub: "No analysis yet", icon: ShieldCheck, color: "text-success" },
    { label: "Resumes", value: counts.resumes, sub: "Total uploaded", icon: FileText, color: "text-foreground" },
    { label: "Verified Badges", value: counts.certs, sub: "On-chain credentials", icon: TrendingUp, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Welcome back, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here's a snapshot of your verification activity.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/resumes"><Upload className="mr-2 h-4 w-4" /> Upload resume</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold">{s.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Verification progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Profile completion", v: 35 },
              { label: "Resume analysis", v: 0 },
              { label: "Certificates verified", v: 0 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">{row.v}%</span>
                </div>
                <Progress value={row.v} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Complete your profile",
              "Upload your first resume",
              "Verify a certificate on-chain",
              "Share your portfolio link",
            ].map((s, i) => (
              <div key={s} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="text-sm">{s}</span>
                <Badge variant="secondary">Step {i + 1}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
