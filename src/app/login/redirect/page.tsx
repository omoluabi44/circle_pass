"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api/config";
import Cookies from "js-cookie";

export default function LoginRedirectPage() {
  const { user, isLoggedIn, isLoading, setSession } = useAuth();

  useEffect(() => {
    // If there is an OAuth hash, we MUST process it and NEVER redirect to /login
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const googleToken = params.get("access_token");
      const targetState = params.get("state") || "/dashboard";

      if (googleToken) {
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${googleToken}` },
        })
          .then((res) => res.json())
          .then(async (googleUser) => {
            const desiredRole = Cookies.get("oauth_role") || "ATTENDEE";
            Cookies.remove("oauth_role");

            const res = await fetch(`${API_URL}/auth/google/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: googleUser.email,
                name: googleUser.name,
                role: desiredRole,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              setSession(data.access, data.refresh, {
                id: data.id,
                email: data.email,
                username: data.username,
                role: data.role,
                isEmailVerified: true,
              });

              const destination =
                data.role === "ORGANIZER"
                  ? "/organizer"
                  : data.role === "ADMIN"
                  ? "/admin"
                  : targetState.includes("/login")
                  ? "/dashboard"
                  : targetState;

              window.location.href = destination;
            } else {
              window.location.href = "/login?error=GoogleAuthFailed";
            }
          })
          .catch((err) => {
            console.error("OAuth error:", err);
            window.location.href = "/login?error=GoogleFetchFailed";
          });
        return;
      }
    }

    // Normal non-hash redirect handling
    if (isLoading) return;

    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    const role = user?.role;
    const dest = role === "ORGANIZER" ? "/organizer" : role === "ADMIN" ? "/admin" : "/dashboard";
    window.location.href = dest;
  }, [user, isLoggedIn, isLoading, setSession]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium">Authenticating & redirecting...</p>
    </div>
  );
}
