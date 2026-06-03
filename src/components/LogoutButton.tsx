import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const { logout } = useAuth0();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
    >
      <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
    </Button>
  );
}
