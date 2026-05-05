import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/verify", label: "Verify" },
  { to: "/blog", label: "Blog" },
];

export default function MarketingLayout() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container-tight flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-glow">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>SkillProof<span className="text-muted-foreground"> AI</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            {user ? (
              <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth?mode=signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-border/60">
        <div className="container-tight grid gap-8 py-12 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-display font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              SkillProof AI
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              AI-powered resume scoring and blockchain-verified credentials for the modern workforce.
            </p>
          </div>
          {[
            { title: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Verify", "/verify"]] },
            { title: "Company", links: [["Blog", "/blog"], ["About", "#"], ["Contact", "#"]] },
            { title: "Legal", links: [["Privacy", "#"], ["Terms", "#"], ["Security", "#"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map(([l, h]) => (
                  <li key={l}>
                    <Link to={h} className="text-muted-foreground hover:text-foreground">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 py-6">
          <p className="container-tight text-xs text-muted-foreground">
            © {new Date().getFullYear()} SkillProof AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
