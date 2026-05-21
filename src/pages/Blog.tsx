import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

const posts = [
  { tag: "AI Resume Tips", title: "Latest AI resume tips for 2026", date: "May 14, 2026", excerpt: "Practical prompts and structures recruiters actually respond to this year." },
  { tag: "Career Guidance", title: "Career guidance for the AI era", date: "May 8, 2026", excerpt: "How to position yourself when half your skills will change in 18 months." },
  { tag: "LinkedIn Growth", title: "LinkedIn growth playbook that actually works", date: "May 2, 2026", excerpt: "Five content patterns that consistently drive recruiter inbound." },
  { tag: "Interview Prep", title: "Interview preparation: the 60-minute method", date: "Apr 22, 2026", excerpt: "A repeatable framework to crush behavioral and system design rounds." },
  { tag: "Resume Optimization", title: "Resume optimization tricks for ATS scoring", date: "Apr 18, 2026", excerpt: "What modern parsers actually look for — and what to avoid." },
  { tag: "Trust & Hiring", title: "The trust score: how we detect inflated claims", date: "Apr 4, 2026", excerpt: "A look inside the SkillProof trust engine and its calibration." },
];

export default function Blog() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return posts;
    return posts.filter((p) => `${p.title} ${p.excerpt} ${p.tag}`.toLowerCase().includes(t));
  }, [q]);

  return (
    <>
      <Helmet>
        <title>Blog — SkillProof AI</title>
        <meta name="description" content="AI resume tips, career guidance, LinkedIn growth, interview prep, and resume optimization tricks from SkillProof AI." />
        <link rel="canonical" href="/blog" />
      </Helmet>

      <div className="container-tight py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">From the blog</h1>
          <p className="mt-4 text-muted-foreground">
            Stories about hiring, trust, AI resumes, and the future of verified work.
          </p>
          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.title} className="group cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-6">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {p.tag}
                </span>
                <h2 className="font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {p.title}
                </h2>
                <p className="text-sm text-muted-foreground">{p.excerpt}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.date}</p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">No articles match your search.</p>
          )}
        </div>
      </div>
    </>
  );
}
