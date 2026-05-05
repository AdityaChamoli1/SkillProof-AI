import { Sparkles, ShieldCheck, Link2, Lock, FileSearch, Users, Bot, Database, Globe, Zap, BarChart3, Bell } from "lucide-react";

const groups = [
  {
    title: "AI Intelligence",
    items: [
      { icon: Sparkles, t: "ATS Scoring", d: "Granular scoring against parser-friendly heuristics." },
      { icon: FileSearch, t: "Skill Extraction", d: "Structured taxonomy with seniority and domain inference." },
      { icon: Bot, t: "AI Suggestions", d: "Actionable rewrites that improve match rate." },
      { icon: ShieldCheck, t: "Trust Engine", d: "Detects inflated claims and unverifiable experience." },
    ],
  },
  {
    title: "Blockchain & Credentials",
    items: [
      { icon: Link2, t: "Polygon Verification", d: "Hash certificates on a low-fee L2 chain." },
      { icon: Database, t: "IPFS Storage", d: "Decentralized, content-addressed credential vault." },
      { icon: Globe, t: "Public Portfolio", d: "Shareable URL with verified badges." },
      { icon: Lock, t: "Tamper-Proof", d: "Any change to the document invalidates the proof." },
    ],
  },
  {
    title: "For Recruiters",
    items: [
      { icon: Users, t: "Smart Search", d: "Filter by verified skills, score thresholds, and trust grade." },
      { icon: BarChart3, t: "Analytics", d: "Pipeline insights and cohort comparisons." },
      { icon: Bell, t: "Alerts", d: "Get notified when matching candidates verify." },
      { icon: Zap, t: "Fast Decisions", d: "One-click reports and exports." },
    ],
  },
];

export default function Features() {
  return (
    <div className="container-tight py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Everything you need to <span className="gradient-text">verify talent</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A complete toolkit for AI-powered resume intelligence and on-chain credential verification.
        </p>
      </div>
      <div className="mt-16 space-y-16">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-2xl font-semibold">{g.title}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {g.items.map((it) => (
                <div key={it.t} className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                    <it.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-base font-semibold">{it.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
