import { useAuth0 } from "@auth0/auth0-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAuthenticated || !user) return null;

  const initials = (user.name || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10">
        {user.picture && <AvatarImage src={user.picture} alt={user.name || "User"} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}
