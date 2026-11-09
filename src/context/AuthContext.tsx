"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/api/config";
import { clearAuthSession, getRefreshToken, getValidAccessToken } from "@/lib/api/fetchWithAuth";
import { installAuthFetchInterceptor } from "@/lib/api/installFetchInterceptor";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: (options?: { callbackUrl?: string }) => void;
  setSession: (accessToken: string, refreshToken?: string, userData?: Partial<User>) => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Install as early as possible (before any component effect fires a request).
if (typeof window !== "undefined") {
  installAuthFetchInterceptor();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Install the global auth fetch interceptor once, so requests that don't go
  // through fetchWithAuth also recover from an invalid/expired access token.
  useEffect(() => {
    installAuthFetchInterceptor();
  }, []);

  // Initialize auth state from cookies / localStorage on mount.
  //
  // The stored access token may already be expired (it only lives 7 days), which
  // used to leave the UI in a "logged in but every request 401s" state for users
  // whose token had lapsed. Silently refresh it before releasing the loading gate.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const storedToken =
          Cookies.get("access_token") ||
          (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
        const storedUserStr = typeof window !== "undefined" ? localStorage.getItem("cp_user") : null;

        if (!storedToken && !storedUserStr && !getRefreshToken()) return;

        let parsedUser: User | null = null;
        if (storedUserStr) {
          try {
            parsedUser = JSON.parse(storedUserStr) as User;
          } catch {
            parsedUser = null;
          }
        }

        // Refresh if the access token is expired / undecodable. Returns null
        // only when the refresh token is missing/rejected, meaning truly signed out.
        const activeToken = await getValidAccessToken(storedToken);
        if (cancelled) return;

        if (!activeToken) {
          clearAuthSession();
          if (typeof window !== "undefined") {
            localStorage.removeItem("cp_user");
            localStorage.removeItem("accessToken");

            // If the user is on a protected page, send them to login instead of
            // leaving them on a page where every request fails.
            if (/^\/(dashboard|organizer|admin)/.test(window.location.pathname)) {
              const callbackUrl = window.location.pathname + window.location.search;
              window.location.href = `/login?reason=session_expired&callbackUrl=${encodeURIComponent(callbackUrl)}`;
            }
          }
          return;
        }

        // Token is valid but the cached profile is missing/corrupt — rebuild it.
        if (!parsedUser) {
          try {
            const meRes = await fetch(`${API_URL}/auth/users/me/`, {
              headers: { Authorization: `Bearer ${activeToken}` },
            });
            if (!meRes.ok) {
              clearAuthSession();
              return;
            }
            const profile = await meRes.json();
            parsedUser = {
              id: profile.id,
              email: profile.email,
              username: profile.username,
              name: profile.name || profile.username,
              role: profile.role || "ATTENDEE",
              isEmailVerified: profile.is_email_verified ?? profile.is_active ?? true,
              phone_number: profile.phone_number,
              avatar: profile.avatar,
            };
            localStorage.setItem("cp_user", JSON.stringify(parsedUser));
          } catch {
            return; // offline — keep the user signed out for this load
          }
          if (cancelled) return;
        }

        setUser(parsedUser);
        setToken(activeToken);

        // Ensure cookies stay in sync for proxy / middleware
        if (!Cookies.get("access_token")) {
          Cookies.set("access_token", activeToken, { expires: 7, sameSite: "lax" });
        }
        if (!localStorage.getItem("accessToken")) {
          localStorage.setItem("accessToken", activeToken);
        }
        if (parsedUser.role && !Cookies.get("user_role")) {
          Cookies.set("user_role", parsedUser.role, { expires: 30, sameSite: "lax" });
        }
      } catch (e) {
        console.error("Error restoring session:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep in-memory token in sync when fetchWithAuth silently refreshes it
  useEffect(() => {
    function handleTokenRefreshed(e: Event) {
      const { accessToken } = (e as CustomEvent<{ accessToken: string }>).detail;
      if (accessToken) setToken(accessToken);
    }
    window.addEventListener("cp:token-refreshed", handleTokenRefreshed);
    return () => window.removeEventListener("cp:token-refreshed", handleTokenRefreshed);
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken?: string, userData?: Partial<User>) => {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    
    // Set cookies for Next.js proxy / middleware
    Cookies.set("access_token", accessToken, { expires: 7, secure: isHttps, sameSite: "lax" });
    if (refreshToken) {
      Cookies.set("refresh_token_cookies", refreshToken, { expires: 30, secure: isHttps, sameSite: "lax" });
      // Mirror in localStorage so refresh still works if cookies are unavailable.
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_token", refreshToken);
      }
    }

    if (userData) {
      const fullUser: User = {
        id: userData.id || "",
        email: userData.email || "",
        username: userData.username || userData.name || "",
        name: userData.name || userData.username || "",
        role: userData.role || "ATTENDEE",
        isEmailVerified: userData.isEmailVerified ?? true,
        phone_number: userData.phone_number,
        avatar: userData.avatar,
      };

      Cookies.set("user_role", fullUser.role, { expires: 30, secure: isHttps, sameSite: "lax" });
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("cp_user", JSON.stringify(fullUser));
      }
      setUser(fullUser);
    }

    setToken(accessToken);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(`${API_URL}/auth/jwt/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.detail || "Invalid email or password";
        return { success: false, error: message };
      }

      const tokens = await res.json();

      // Fetch user profile with the access token
      const userRes = await fetch(`${API_URL}/auth/users/me/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });

      if (!userRes.ok) {
        return { success: false, error: "Failed to fetch user profile" };
      }

      const profile = await userRes.json();
      const userData: User = {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        name: profile.name || profile.username,
        role: profile.role || "ATTENDEE",
        isEmailVerified: profile.is_email_verified ?? profile.is_active ?? true,
        phone_number: profile.phone_number,
        avatar: profile.avatar,
      };

      setSession(tokens.access, tokens.refresh, userData);
      return { success: true, user: userData };
    } catch (err: any) {
      console.error("Login network error:", err);
      return { success: false, error: err.message || "An unexpected error occurred. Please try again." };
    }
  }, [setSession]);

  const logout = useCallback((options?: { callbackUrl?: string }) => {
    Cookies.remove("refresh_token_cookies");
    Cookies.remove("access_token");
    Cookies.remove("user_role");

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("cp_user");
    }

    setUser(null);
    setToken(null);

    const target = options?.callbackUrl || "/login";
    if (typeof window !== "undefined") {
      window.location.href = target;
    }
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      if (typeof window !== "undefined") {
        localStorage.setItem("cp_user", JSON.stringify(updated));
      }
      if (data.role) {
        Cookies.set("user_role", data.role, { expires: 30, sameSite: "lax" });
      }
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: !!user && !!token,
      isLoading,
      login,
      logout,
      setSession,
      updateUser,
    }),
    [user, token, isLoading, login, logout, setSession, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Global drop-in helper for useSession() with stable memoized references
export function useSession() {
  const context = useContext(AuthContext);

  const user = context?.user;
  const token = context?.token;
  const isLoading = context?.isLoading ?? false;
  const updateUser = context?.updateUser;

  const data = useMemo(() => {
    if (!user) return null;
    return {
      user,
      accessToken: token || undefined,
    };
  }, [user, token]);

  const status = useMemo(() => {
    if (!context) return "unauthenticated" as const;
    if (isLoading) return "loading" as const;
    return user ? ("authenticated" as const) : ("unauthenticated" as const);
  }, [context, isLoading, user]);

  return useMemo(
    () => ({
      data,
      status,
      update: updateUser || (() => {}),
    }),
    [data, status, updateUser]
  );
}

// Global drop-in helpers for signOut / signIn
export function signOut(options?: { callbackUrl?: string }) {
  Cookies.remove("refresh_token_cookies");
  Cookies.remove("access_token");
  Cookies.remove("user_role");
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cp_user");
    window.location.href = options?.callbackUrl || "/login";
  }
}

export function signIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
