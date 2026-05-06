import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, FileText, Users, Award } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    users: 0,
    resumes: 0,
    certs: 0,
    verified: 0,
    avgAts: 0,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const ok = roles?.some((r) => r.role === "admin") ?? false;
      setAllowed(ok);
      if (!ok) return;

      const [u, r, c, v, ats] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("resumes").select("*", { count: "exact", head: true }),
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase
          .from("certificates")
          .select("*", { count: "exact", head: true })
          .eq("verified", true),
        supabase.from("resumes").select("ats_score").not("ats_score", "is", null),
      ]);
      const scores = (ats.data ?? []).map((x: any) => x.ats_score as number);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      setStats({
        users: u.count ?? 0,
        resumes: r.count ?? 0,
        certs: c.count ?? 0,
        verified: v.count ?? 0,
        avgAts: avg,
      });
    })();
  }, [user]);

  if (allowed === null)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!allowed) return <Navigate to="/dashboard" replace />;

  const cards = [
    { label: "Users", value: stats.users, icon: Users },
    { label: "Resumes", value: stats.resumes, icon: FileText },
    { label: "Certificates", value: stats.certs, icon: Award },
    { label: "Verified", value: stats.verified, icon: ShieldCheck },
    { label: "Avg ATS", value: stats.avgAts || "—", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Platform health and verification metrics.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
