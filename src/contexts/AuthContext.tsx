import { createContext, useContext, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, logout } = useAuth0();

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
    <Ctx.Provider value={{ user: mapped, loading: isLoading, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
