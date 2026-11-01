import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { API_URL } from "@/lib/api/config";

// Determine if we're running on HTTPS (production)
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

// Resolve hostname from NEXTAUTH_URL but guard against Docker internal hostnames
// (container IDs / service names with no dots). Falls back to undefined so the
// session cookie is not scoped to a bogus domain.
function resolveHostname(): string | undefined {
  try {
    const raw = process.env.NEXTAUTH_URL;
    if (!raw) return undefined;
    const h = new URL(raw).hostname;
    if (h === "localhost") return undefined;
    // A real domain always has at least one dot. Container IDs don't.
    if (!h.includes(".")) return undefined;
    return h;
  } catch {
    return undefined;
  }
}
const hostName = resolveHostname();

// Bump this number to immediately invalidate ALL existing sessions.
// Any JWT token that doesn't carry this exact version will be rejected
// and the user will be redirected to /login.
const CURRENT_SESSION_VERSION = 2;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  // ─── Cookie config ───────────────────────────────────────────────────────────
  // OAuth-flow cookies (state, pkce, callbackUrl, csrf) need SameSite=None so
  // they survive the Google cross-site redirect. The session token itself stays
  // SameSite=Lax (first-party only).
  cookies: {
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: useSecureCookies,
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: "none",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: useSecureCookies,
      },
    },
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: hostName, // undefined for localhost & Docker internal names
      },
    },
  },
  // ─────────────────────────────────────────────────────────────────────────────

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        access_token: { label: "Token", type: "text" },
        refresh_token: { label: "Token", type: "text" },
        user_data: { label: "Data", type: "text" }
      },
      async authorize(credentials) {
        // Pre-authenticated path (e.g. Google OAuth redirect passing tokens directly)
        if (credentials?.access_token && credentials?.user_data) {
          const user = JSON.parse(credentials.user_data);
          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: true,
            accessToken: credentials.access_token,
          };
        }

        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/jwt/create/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });

          if (!res.ok) {
            const errData = await res.text();
            console.error("Login failed on backend:", res.status, errData);
            return null;
          }

          const tokens = await res.json();

          // Fetch user details with the token
          const userRes = await fetch(`${API_URL}/auth/users/me/`, {
            headers: { 'Authorization': `Bearer ${tokens.access}` }
          });

          if (!userRes.ok) {
            console.error("Failed to fetch user details:", userRes.status);
            return null;
          }

          const user = await userRes.json();

          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: user.is_email_verified ?? user.is_active ?? true,
            // NOTE: do NOT store refreshToken in the JWT — it bloats the cookie
            // beyond 4KB which causes chunking issues on mobile browsers.
            accessToken: tokens.access,
          };
        } catch (error) {
          console.error("Network or fetch error during login:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // ── Global logout guard ───────────────────────────────────────────────
      // If the stored session version doesn't match CURRENT_SESSION_VERSION,
      // return an empty token — NextAuth will treat the session as invalid and
      // redirect the user to /login on their next protected-route visit.
      if (token.sessionVersion !== CURRENT_SESSION_VERSION && !user && !account) {
        return {} as typeof token;
      }
      // ─────────────────────────────────────────────────────────────────────
      if (account?.provider === "google" && profile) {
        // Exchange Google profile for Django JWT tokens.
        try {
          console.log("Attempting Google Auth to backend with:", profile.email, "URL:", `${API_URL}/auth/google/`);

          let desiredRole = 'ATTENDEE';
          try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const oauthCookie = cookieStore.get('oauth_role')?.value;
            if (oauthCookie === 'ORGANIZER' || oauthCookie === 'ATTENDEE') {
              desiredRole = oauthCookie;
            }
          } catch (e) {}

          const res = await fetch(`${API_URL}/auth/google/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              role: desiredRole
            })
          });

          console.log("Backend Google Auth response status:", res.status);

          if (res.ok) {
            const data = await res.json();
            token.role = data.role;
            token.accessToken = data.access;
            token.sessionVersion = CURRENT_SESSION_VERSION;
            // Do NOT store data.refresh — keep cookie small
            console.log("Successfully set tokens from backend!");
          } else {
            console.error("Backend returned error:", await res.text());
          }
        } catch (error) {
          console.error("Google auth to backend failed", error);
        }
      } else if (user) {
        // Initial credentials sign-in — copy only what we need
        token.role = (user as any).role;
        token.isEmailVerified = (user as any).isEmailVerified;
        token.accessToken = (user as any).accessToken;
        token.sessionVersion = CURRENT_SESSION_VERSION;
        // refreshToken intentionally omitted to keep JWT small
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.accessToken || token.sessionVersion !== CURRENT_SESSION_VERSION) {
        return null as any;
      }
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.isEmailVerified = token.isEmailVerified as boolean;
        session.accessToken = token.accessToken as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};
