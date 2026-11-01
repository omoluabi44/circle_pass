"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api/config";
import Cookies from "js-cookie";

export default function LoginRedirectPage() {
  const { user, isLoggedIn, isLoading, setSession } = useAuth();
  const router = useRouter();
  const [processingOAuth, setProcessingOAuth] = useState(false);

  useEffect(() => {
    // 1. Check for OAuth access_token in the URL hash (from Google redirect)
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const googleToken = params.get("access_token");
      const targetState = params.get("state") || "/dashboard";

      if (googleToken) {
        setProcessingOAuth(true);
        // Fetch user info from Google
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${googleToken}` },
        })
          .then((res) => res.json())
          .then(async (googleUser) => {
            const desiredRole = Cookies.get("oauth_role") || "ATTENDEE";
            Cookies.remove("oauth_role");

            // Post to backend Google auth endpoint
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

              if (data.role === "ORGANIZER") {
                router.replace("/organizer");
              } else if (data.role === "ADMIN") {
                router.replace("/admin");
              } else {
                router.replace(targetState);
              }
            } else {
              console.error("Backend Google auth failed");
              router.replace("/login?error=GoogleAuthFailed");
            }
          })
          .catch((err) => {
            console.error("OAuth error:", err);
            router.replace("/login?error=GoogleFetchFailed");
          });
        return;
      }
    }

    if (isLoading || processingOAuth) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const role = user?.role;
    if (role === "ORGANIZER") {
      router.replace("/organizer");
    } else if (role === "ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [user, isLoggedIn, isLoading, router, setSession, processingOAuth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium">Redirecting to your dashboard...</p>
    </div>
  );
}
