import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Twitter, Github, Linkedin } from "lucide-react";
import { toast } from "sonner";

const faqs = [
  { q: "How does SkillProof verify credentials?", a: "Every uploaded certificate is hashed with SHA-256 and stored with a verifiable fingerprint anyone can check via /verify." },
  { q: "Is my resume data private?", a: "Yes. Resumes are stored in encrypted storage and only readable by you and recruiters you explicitly share with." },
  { q: "Do you offer enterprise plans?", a: "Yes — contact us below for SSO, custom limits, and dedicated support." },
  { q: "Can I delete my account and data?", a: "Absolutely. You can wipe all data from Settings → Danger Zone at any time." },
];

export default function Contact() {
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Message sent", { description: "We'll get back to you within 24 hours." });
    }, 800);
  };

  return (
    <>
      <Helmet>
        <title>Contact — SkillProof AI</title>
        <meta name="description" content="Get in touch with the SkillProof AI team for support, partnerships, or enterprise inquiries." />
        <link rel="canonical" href="/contact" />
      </Helmet>

      <section className="container-tight py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> Get in touch
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            We'd love to hear from you.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Questions, feedback, or partnership ideas — drop us a line and we'll respond fast.
          </p>
        </div>
      </section>

      <section className="container-tight pb-24">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardContent className="p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" required placeholder="Ada Lovelace" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required placeholder="you@company.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" required placeholder="How can we help?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" required rows={6} placeholder="Tell us more..." />
                </div>
                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  {sending ? "Sending..." : "Send message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">Email support</p>
                    <a href="mailto:support@skillproof.ai" className="font-medium hover:text-primary">
                      support@skillproof.ai
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Average response time: under 24 hours, Mon–Fri.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-6">
                <h3 className="font-semibold">Follow us</h3>
                <div className="flex gap-2">
                  {[
                    { icon: Twitter, href: "#" },
                    { icon: Linkedin, href: "#" },
                    { icon: Github, href: "#" },
                  ].map((s, i) => (
                    <Button key={i} asChild variant="outline" size="icon">
                      <a href={s.href} aria-label="social link"><s.icon className="h-4 w-4" /></a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-tight pb-24">
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">Frequently asked</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="space-y-2 p-6">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
