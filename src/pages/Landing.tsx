import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Link2, Lock, Gauge, FileSearch, Users, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI ATS Scoring", desc: "Resume parsed against 200+ ATS criteria with instant, explainable scoring." },
  { icon: ShieldCheck, title: "Trust Score", desc: "Detect inflated experience and unverifiable claims with our trust engine." },
  { icon: Link2, title: "On-Chain Verification", desc: "Hash certificates to Polygon and IPFS for tamper-proof credentials." },
  { icon: FileSearch, title: "Skill Extraction", desc: "Structured taxonomy of skills, seniority, and domain expertise." },
  { icon: Users, title: "Recruiter Matching", desc: "Smart ranking surfaces verified candidates first." },
  { icon: Lock, title: "Enterprise Security", desc: "Row-level security, audit logs, and SOC2-aligned controls." },
];

const logos = ["Acme", "Northwind", "Globex", "Initech", "Umbrella", "Hooli"];

export default function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden hero-bg">
        <div className="absolute inset-0 mesh-bg opacity-70" aria-hidden />
        <div className="container-tight relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <Badge variant="secondary" className="mb-6 rounded-full border border-border/60 bg-card/60 px-3 py-1 backdrop-blur">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success" /> Now in public beta
            </Badge>
            <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
              Resumes you can <span className="gradient-text">actually trust</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              SkillProof AI scores resumes with ATS-grade analysis, detects inflated claims, and verifies
              certificates on the blockchain — so recruiters hire faster and candidates stand out.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-elevated">
                <Link to="/auth?mode=signup">Start free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/features">See how it works</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> No credit card</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Free 5 scans / mo</span>
            </div>
          </div>

          {/* mock dashboard preview */}
          <div className="relative mx-auto mt-16 max-w-5xl animate-fade-up">
            <div className="glass-card overflow-hidden rounded-2xl shadow-elevated">
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">app.skillproof.ai/dashboard</span>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-3">
                {[
                  { label: "ATS Score", val: "92", sub: "Excellent", color: "text-success" },
                  { label: "Trust Score", val: "A+", sub: "All claims verified", color: "text-primary" },
                  { label: "On-Chain Badges", val: "4", sub: "Polygon · IPFS", color: "text-foreground" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-border/60 bg-card p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                    <p className={`mt-2 font-display text-3xl font-semibold ${c.color}`}>{c.val}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -inset-x-20 -bottom-10 -z-10 h-40 bg-gradient-brand opacity-20 blur-3xl" aria-hidden />
          </div>
        </div>
      </section>

      {/* LOGO STRIP */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container-tight py-10">
          <p className="mb-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Trusted by teams shipping fast
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
            {logos.map((l) => (
              <span key={l} className="font-display text-xl font-semibold tracking-tight">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container-tight py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Platform</Badge>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            One platform for verified hiring
          </h2>
          <p className="mt-3 text-muted-foreground">
            From ATS parsing to on-chain credentials, SkillProof gives every stakeholder a single source of truth.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="container-tight py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              From upload to verified in 60 seconds
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Upload", d: "Drop in a resume or certificate. We parse the structure and content." },
              { n: "02", t: "Analyze", d: "AI scores ATS fit, extracts skills, and assesses trust signals." },
              { n: "03", t: "Verify", d: "Hash credentials on Polygon and mint a shareable verified badge." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border/60 bg-card p-6">
                <p className="font-mono text-xs text-muted-foreground">{s.n}</p>
                <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container-tight py-24">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { k: "120k+", v: "Resumes analyzed" },
            { k: "98.4%", v: "ATS accuracy" },
            { k: "0.6s", v: "Median scoring time" },
            { k: "32k", v: "On-chain credentials" },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl border border-border/60 bg-card p-6 text-center">
              <p className="font-display text-3xl font-semibold gradient-text">{s.k}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-10 text-center shadow-elevated md:p-16">
          <div className="absolute inset-0 mesh-bg opacity-60" aria-hidden />
          <div className="relative">
            <Gauge className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Hire with proof, not promises.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join thousands of candidates and recruiters using SkillProof to bring trust back to hiring.
            </p>
            <Button asChild size="lg" className="mt-6 shadow-elevated">
              <Link to="/auth?mode=signup">Create free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
