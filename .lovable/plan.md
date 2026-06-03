# Migrate Authentication: Supabase Auth → Auth0

## ⚠️ Critical Warnings — Read Before Approving

This migration has **serious consequences** for your existing data. Please confirm you understand:

1. **All existing users lose access to their data.** Your RLS policies use `auth.uid()` from Supabase JWTs. Auth0 issues different JWTs with different user IDs. After migration:
   - Existing users cannot log into their old accounts
   - Existing resumes, certificates, profiles, and roles become **orphaned** (still in DB, but no one can read them)
   - The `handle_new_user()` trigger on `auth.users` stops firing — no profiles/roles created on signup

2. **All database access from the frontend breaks** unless we rebuild the bridge. RLS depends on Supabase JWTs. Options:
   - **(A) Strip RLS** and make tables public — insecure, not recommended
   - **(B) Build an Auth0 → Supabase JWT exchange** via an edge function (complex, ~1 day extra work, not in this plan)
   - **(C) Accept that frontend can no longer read/write user-scoped data** until (B) is built

3. **Edge functions** (`upload-resume`, `upload-certificate`, `analyze-resume`, `verify-credential`) that verify Supabase JWTs will reject Auth0 tokens. They need rewriting or disabling.

4. **The credentials you provided are Auth0-side only.** I cannot configure your Auth0 dashboard, Google social connection, callback URLs, or allowed origins — you must do that manually.

**My strong recommendation:** Stay on Supabase Auth and finish configuring the Google Client ID/Secret in the Supabase dashboard (one 5-minute task). But if you want to proceed with Auth0, here is the plan.

---

## Plan (assuming you accept the warnings above)

### 1. Install
- `bun add @auth0/auth0-react`

### 2. Environment variables (you add to `.env` locally + Vercel)
```
VITE_AUTH0_DOMAIN=dev-16d44fvwtiyqw4lc.us.auth0.com
VITE_AUTH0_CLIENT_ID=H2zpz9M0cQofVT7v9y9eRW0HBa9k1vJL
```

### 3. Files removed / cleaned
- `src/contexts/AuthContext.tsx` — replaced with Auth0 wrapper
- `src/pages/Auth.tsx` — replaced with simple "Redirecting to Auth0…" page
- `src/components/ProtectedRoute.tsx` — rewritten to use `useAuth0().isAuthenticated`
- All `supabase.auth.*` calls in components (sign-in, sign-out buttons in `DashboardLayout`, `Settings`, etc.) — replaced with Auth0 equivalents

### 4. Files created
- `src/auth/Auth0ProviderWithNavigate.tsx` — wraps `<Auth0Provider>` with React Router `useNavigate` for post-login redirects
- `src/components/LoginButton.tsx` — calls `loginWithRedirect()`
- `src/components/LogoutButton.tsx` — calls `logout({ logoutParams: { returnTo: window.location.origin } })`
- `src/components/UserProfile.tsx` — shows `user.name`, `user.email`, `user.picture`
- `src/hooks/useAuth.ts` — thin wrapper around `useAuth0()` so the rest of the app keeps `useAuth()` API

### 5. Files modified
- `src/App.tsx` — wrap `<BrowserRouter>` with `<Auth0ProviderWithNavigate>`, remove `<AuthProvider>`
- `src/main.tsx` — no change
- Every page that calls `useAuth()` from the old context — updated to new hook

### 6. Database / backend changes
- **None required for the migration itself.** But the four edge functions and all RLS policies will silently stop working for the frontend. We are *not* fixing them in this plan.

---

## Auth0 Dashboard Configuration (you do this)

In your Auth0 application (`H2zpz9M0cQofVT7v9y9eRW0HBa9k1vJL`):

**Application Type:** Single Page Application

**Allowed Callback URLs:**
```
http://localhost:5173,
https://skill-proof-ai-eta.vercel.app,
https://skill-aura-net.lovable.app,
https://id-preview--5352e53b-96f1-4777-be16-fd8eaccea80a.lovable.app
```

**Allowed Logout URLs:** same list as above

**Allowed Web Origins:** same list as above

**Allowed Origins (CORS):** same list as above

**Connections → Social → Google:** Enable, configure with your Google Client ID/Secret (or use Auth0's dev keys for testing only).

---

## Vercel Configuration (you do this)

1. Project Settings → Environment Variables → add `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` for all environments
2. Redeploy

---

## Technical Details

- `Auth0Provider` uses `authorizationParams.redirect_uri: window.location.origin` so it works on every domain without code changes
- `cacheLocation: "localstorage"` + `useRefreshTokens: true` enable session persistence across refreshes
- Expired sessions: `useAuth0()` returns `isAuthenticated: false` → `ProtectedRoute` redirects to `/auth`
- Existing Supabase client stays in the codebase but is no longer used for auth (only for data, which will fail until RLS is reworked)

---

## What This Plan Does NOT Include

- Migrating existing users from Supabase Auth into Auth0
- Re-keying existing resumes/certificates/profiles to new Auth0 user IDs
- Auth0 → Supabase JWT exchange (so RLS keeps working)
- Rewriting the four edge functions to accept Auth0 tokens

If you need any of those, they are separate follow-up tasks. **Reply "proceed" to execute this plan as scoped, or "cancel" to keep Supabase Auth.**
