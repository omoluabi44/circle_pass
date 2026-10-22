import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { API_URL } from "@/lib/api/config";

// Determine if we're running on HTTPS (production)
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const hostName = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).hostname
  : "localhost";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  // ─── FIX: "State cookie was missing" on Google OAuth ───────────────────────
  // When Google redirects back to the app after OAuth, the browser performs a
  // cross-site redirect. Browsers with strict SameSite defaults (Chrome 80+,
  // Firefox, Safari) DROP cookies that are SameSite=Lax on cross-site POSTs/
  // redirects. NextAuth's state & PKCE cookies default to SameSite=Lax, so
  // the state cookie is gone by the time the callback runs → "State cookie was
  // missing" → NextAuth throws, session is never created, middleware bounces
  // the user back to /login. The user had to click twice because the second
  // click hit a GET-based redirect instead of the cross-site POST that drops
  // the cookie. Fix: set SameSite=None; Secure on all OAuth-flow cookies.
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
        maxAge: 900, // 15 min — enough for the OAuth round-trip
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
        sameSite: "lax", // session token is first-party only — keep Lax
        path: "/",
        secure: useSecureCookies,
        domain: hostName === "localhost" ? undefined : hostName,
      },
    },
  },
  // ────────────────────────────────────────────────────────────────────────────

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
        if (credentials?.access_token && credentials?.user_data) {
          const user = JSON.parse(credentials.user_data);
          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: true,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token,
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
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
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
      if (account?.provider === "google" && profile) {
        // Exchange Google profile for Django JWT tokens.
        // Do NOT use next/headers cookies() here — that context is unavailable
        // during the OAuth callback and causes silent failures.
        try {
          console.log("Attempting Google Auth to backend with:", profile.email, "URL:", `${API_URL}/auth/google/`);

          const res = await fetch(`${API_URL}/auth/google/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              role: 'ATTENDEE'
            })
          });

          console.log("Backend Google Auth response status:", res.status);

          if (res.ok) {
            const data = await res.json();
            token.role = data.role;
            token.accessToken = data.access;
            token.refreshToken = data.refresh;
            console.log("Successfully set tokens from backend!");
          } else {
            console.error("Backend returned error:", await res.text());
          }
        } catch (error) {
          console.error("Google auth to backend failed", error);
        }
      } else if (user) {
        // Initial credentials sign-in
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
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
    // newUser: '/register' intentionally removed — Google users go straight to dashboard
  }
};
