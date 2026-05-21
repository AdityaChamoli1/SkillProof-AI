import { Helmet } from "react-helmet-async";

const sections = [
  {
    title: "1. Information we collect",
    body: "We collect account information (email, name), uploaded documents (resumes, certificates), and usage analytics to improve the product. We never sell personal data.",
  },
  {
    title: "2. How we use your data",
    body: "Your data powers your account: ATS scoring, credential verification, and recruiter visibility (only when you opt in). Aggregated, anonymized metrics are used to improve algorithms.",
  },
  {
    title: "3. Cookies",
    body: "We use essential cookies for authentication and optional analytics cookies to understand product usage. You can disable non-essential cookies in your browser settings.",
  },
  {
    title: "4. Data protection",
    body: "All data is encrypted at rest and in transit (TLS 1.3, AES-256). Documents are stored in private, access-controlled storage with row-level security enforced at the database layer.",
  },
  {
    title: "5. Your rights (GDPR & CCPA)",
    body: "You can access, export, correct, or delete your data at any time from Settings. Email privacy@skillproof.ai for formal data subject requests; we respond within 30 days.",
  },
  {
    title: "6. Data retention",
    body: "Account data is retained while your account is active. Deleted accounts are purged within 30 days. Backups are rotated within 90 days.",
  },
  {
    title: "7. Third parties",
    body: "We use a minimal set of subprocessors (cloud hosting, email delivery, payments). A current list is available on request.",
  },
  {
    title: "8. Changes",
    body: "We'll notify you by email of material changes to this policy at least 14 days before they take effect.",
  },
];

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — SkillProof AI</title>
        <meta name="description" content="How SkillProof AI collects, uses, and protects your personal data. GDPR and CCPA compliant." />
        <link rel="canonical" href="/privacy" />
      </Helmet>

      <article className="container-tight max-w-3xl py-24">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: May 21, 2026</p>

        <p className="mt-8 text-muted-foreground">
          This Privacy Policy describes how SkillProof AI ("we", "us") handles your personal information when you use our platform.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
