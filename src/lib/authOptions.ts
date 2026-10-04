import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { API_URL } from "@/lib/api/config";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
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
      },
      async authorize(credentials) {
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
        // Exchange Google email/profile for Django token
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const selectedRole = cookieStore.get('oauth_role')?.value || 'ATTENDEE';
          
          console.log("Attempting Google Auth to backend with:", profile.email, selectedRole, "URL:", `${API_URL}/auth/google/`);
          
          const res = await fetch(`${API_URL}/auth/google/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              role: selectedRole
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
    newUser: '/register'
  }
};
