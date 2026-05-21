import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShieldCheck, KeyRound, Database, Cpu, FileCheck2, BadgeCheck, ServerCog } from "lucide-react";

const pillars = [
  { icon: Lock, title: "Encryption everywhere", desc: "TLS 1.3 in transit. AES-256 at rest. Per-tenant keys for sensitive blobs." },
  { icon: KeyRound, title: "Secure authentication", desc: "Email + OAuth with PKCE, hardware-key support, and short-lived session tokens." },
  { icon: Database, title: "Row-level security", desc: "Every database query enforces row-level policies — users can only ever see their own data." },
  { icon: Cpu, title: "AI safety", desc: "We never train models on your private documents. Prompts and outputs are isolated per user." },
  { icon: FileCheck2, title: "Tamper-proof credentials", desc: "SHA-256 fingerprints make every certificate publicly verifiable without revealing the file." },
  { icon: ServerCog, title: "Hardened infrastructure", desc: "Hosted on SOC 2 Type II providers with continuous vulnerability scanning and audit logging." },
];

const badges = [
  { label: "SOC 2 ready", icon: BadgeCheck },
  { label: "GDPR compliant", icon: ShieldCheck },
  { label: "CCPA compliant", icon: ShieldCheck },
  { label: "Encrypted at rest", icon: Lock },
];

export default function Security() {
  return (
    <>
      <Helmet>
        <title>Security — SkillProof AI</title>
        <meta name="description" content="How SkillProof AI protects your data with encryption, secure auth, row-level security, and tamper-proof credentials." />
        <link rel="canonical" href="/security" />
      </Helmet>

      <section className="container-tight py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Security at SkillProof AI
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Built on proof, not promises.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Security is the product. Every layer — from authentication to AI inference — is designed to keep your data private and verifiable.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
          {badges.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium shadow-sm">
              <b.icon className="h-4 w-4 text-primary" /> {b.label}
            </span>
          ))}
        </div>
      </section>

      <section className="container-tight pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title}>
              <CardContent className="space-y-3 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-tight pb-24">
        <Card>
          <CardContent className="space-y-3 p-10">
            <h2 className="font-display text-2xl font-semibold">Report a vulnerability</h2>
            <p className="text-muted-foreground">
              We welcome responsible disclosure. Email{" "}
              <a className="text-primary hover:underline" href="mailto:security@skillproof.ai">security@skillproof.ai</a>{" "}
              with reproduction steps and we'll acknowledge within 48 hours.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
