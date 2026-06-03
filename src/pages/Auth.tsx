import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Auth() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get("mode") === "signup" ? "signup" : "login";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({
        authorizationParams: { screen_hint: mode === "signup" ? "signup" : undefined },
        appState: { returnTo: "/dashboard" },
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, mode]);

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-brand text-primary-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-background/15 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </span>
          SkillProof AI
        </Link>
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm opacity-80">Redirecting to secure sign-in…</p>
        <Button
          variant="secondary"
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { screen_hint: mode === "signup" ? "signup" : undefined },
              appState: { returnTo: "/dashboard" },
            })
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
