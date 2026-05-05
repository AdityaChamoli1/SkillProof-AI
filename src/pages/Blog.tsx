const posts = [
  { title: "Why blockchain credentials matter in 2026", date: "May 2, 2026", excerpt: "Trust is the bottleneck of modern hiring. On-chain verification removes it." },
  { title: "Building an ATS-friendly resume in 2026", date: "Apr 18, 2026", excerpt: "What modern parsers actually look for — and what to avoid." },
  { title: "The trust score: how we detect inflated claims", date: "Apr 4, 2026", excerpt: "A look inside the SkillProof trust engine and its calibration." },
];

export default function Blog() {
  return (
    <div className="container-tight py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">From the blog</h1>
        <p className="mt-4 text-muted-foreground">Stories about hiring, trust, and the future of verified work.</p>
      </div>
      <div className="mx-auto mt-14 max-w-3xl divide-y divide-border/60">
        {posts.map((p) => (
          <article key={p.title} className="group cursor-pointer py-8">
            <p className="font-mono text-xs text-muted-foreground">{p.date}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary">
              {p.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
