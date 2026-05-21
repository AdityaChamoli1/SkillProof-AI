import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Target, Sparkles, Users, Rocket, Lock } from "lucide-react";

export default function About() {
  const features = [
    { icon: Sparkles, title: "AI Resume Scoring", desc: "Real ATS analysis powered by modern LLMs." },
    { icon: ShieldCheck, title: "Verified Credentials", desc: "Tamper-proof certificates with SHA-256 fingerprints." },
    { icon: Users, title: "Recruiter Search", desc: "Find candidates by verified skills, not keywords." },
    { icon: Rocket, title: "Career Growth", desc: "Personalized guidance to land your next role." },
  ];

  return (
    <>
      <Helmet>
        <title>About — SkillProof AI</title>
        <meta name="description" content="SkillProof AI verifies resumes and credentials with AI and cryptographic proofs to make hiring trustworthy." />
        <link rel="canonical" href="/about" />
      </Helmet>

      <section className="container-tight py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Our story
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Trust, rebuilt for modern hiring.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            SkillProof AI combines AI-powered resume scoring with cryptographically verified credentials —
            so every claim on a resume can be proven, not just promised.
          </p>
        </div>
      </section>

      <section className="container-tight pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-8">
              <h2 className="font-display text-2xl font-semibold">Mission</h2>
              <p className="text-muted-foreground">
                Make hiring fair and fast by removing the trust gap between candidates and employers.
                Every skill, credential, and claim should be instantly verifiable.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-8">
              <h2 className="font-display text-2xl font-semibold">Vision</h2>
              <p className="text-muted-foreground">
                A world where talent is recognized by proof of skill — not pedigree, keywords, or chance.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container-tight pb-20">
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">Why we built this</h2>
        <p className="max-w-3xl text-muted-foreground">
          Traditional ATS systems filter candidates by keyword density and lose great talent. Resumes can be
          inflated. Certificates can be faked. Hiring teams waste hours verifying claims manually. We built
          SkillProof AI to solve all three problems in one platform.
        </p>
      </section>

      <section className="container-tight pb-24">
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">What the platform offers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="space-y-3 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-tight pb-24">
        <Card>
          <CardContent className="grid gap-6 p-10 md:grid-cols-[auto_1fr] md:items-center">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Founder</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">Built by engineers who hired engineers</h3>
              <p className="mt-3 text-muted-foreground">
                After years of screening thousands of resumes, our team realized the hiring stack was broken.
                SkillProof AI is the platform we always wished existed — built openly, with privacy and proof at its core.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
