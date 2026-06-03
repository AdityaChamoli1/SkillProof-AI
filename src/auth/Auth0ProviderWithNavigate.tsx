import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Auth0Provider, AppState } from "@auth0/auth0-react";

const domain = import.meta.env.VITE_AUTH0_DOMAIN || "dev-16d44fvwtiyqw4lc.us.auth0.com";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "H2zpz9M0cQofVT7v9y9eRW0HBa9k1vJL";

export default function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || "/dashboard");
  };

  if (!domain || !clientId) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
