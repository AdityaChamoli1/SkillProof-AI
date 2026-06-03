import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AuthSession = {
  access_token: string;
} | null;

type AuthCtx = {
  user: AuthUser | null;
  session: AuthSession;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, isAuthenticated, logout, getIdTokenClaims } = useAuth0();
  const [session, setSession] = useState<AuthSession>(null);

  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      getIdTokenClaims().then((claims) => {
        if (active && claims?.__raw) setSession({ access_token: claims.__raw });
      });
    } else {
      setSession(null);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, getIdTokenClaims]);

  const mapped: AuthUser | null = user
    ? {
        id: user.sub ?? "",
        email: user.email,
        name: user.name,
        picture: user.picture,
      }
    : null;

  const signOut = async () => {
    await logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <Ctx.Provider value={{ user: mapped, session, loading: isLoading, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
