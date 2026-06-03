import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function LoginButton({ screenHint }: { screenHint?: "signup" | "login" }) {
  const { loginWithRedirect } = useAuth0();
  return (
    <Button
      onClick={() =>
        loginWithRedirect({
          authorizationParams: { screen_hint: screenHint },
          appState: { returnTo: "/dashboard" },
        })
      }
      className="gap-2"
    >
      <LogIn className="h-4 w-4" />
      {screenHint === "signup" ? "Sign up" : "Log in"}
    </Button>
  );
}
