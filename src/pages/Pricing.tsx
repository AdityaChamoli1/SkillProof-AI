import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring SkillProof.",
    features: ["5 AI scans / month", "Basic ATS scoring", "1 verified badge", "Public portfolio"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    desc: "For serious candidates and freelancers.",
    features: ["Unlimited AI scans", "Trust score + AI suggestions", "Unlimited blockchain badges", "Priority support"],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Recruiter",
    price: "$99",
    period: "per month",
    desc: "For teams hiring at scale.",
    features: ["Candidate search", "Trust ranking", "Team seats", "API access", "Audit logs"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="container-tight py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Simple, transparent <span className="gradient-text">pricing</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-2xl border p-7 ${
              t.highlight
                ? "border-primary/40 bg-card shadow-elevated"
                : "border-border/60 bg-card shadow-card"
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-brand px-3 py-1 text-xs font-medium text-primary-foreground shadow-glow">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-semibold">{t.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold">{t.price}</span>
              <span className="text-sm text-muted-foreground">/{t.period}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-7" variant={t.highlight ? "default" : "outline"}>
              <Link to="/auth?mode=signup">{t.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
