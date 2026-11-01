"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/api/config";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from cookies / localStorage on mount
  useEffect(() => {
    try {
      const storedToken = Cookies.get("access_token") || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
      const storedUserStr = typeof window !== "undefined" ? localStorage.getItem("cp_user") : null;

      if (storedToken && storedUserStr) {
        const parsedUser = JSON.parse(storedUserStr);
        setUser(parsedUser);
        setToken(storedToken);

        // Ensure cookies stay in sync for proxy / middleware
        if (!Cookies.get("access_token")) {
          Cookies.set("access_token", storedToken, { expires: 7, sameSite: "lax" });
        }
        if (parsedUser.role && !Cookies.get("user_role")) {
          Cookies.set("user_role", parsedUser.role, { expires: 30, sameSite: "lax" });
        }
      }
    } catch (e) {
      console.error("Error restoring session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken?: string, userData?: Partial<User>) => {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    
    // Set cookies for Next.js proxy / middleware
    Cookies.set("access_token", accessToken, { expires: 7, secure: isHttps, sameSite: "lax" });
    if (refreshToken) {
      Cookies.set("refresh_token_cookies", refreshToken, { expires: 30, secure: isHttps, sameSite: "lax" });
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
      const res = await fetch(`${API_URL}/auth/jwt/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user && !!token,
        isLoading,
        login,
        logout,
        setSession,
        updateUser,
      }}
    >
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

// Global drop-in helper for useSession()
export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    return { data: null, status: "unauthenticated" as const, update: () => {} };
  }
  const { user, token, isLoading, updateUser } = context;

  return {
    data: user
      ? {
          user,
          accessToken: token || undefined,
        }
      : null,
    status: isLoading
      ? ("loading" as const)
      : user
      ? ("authenticated" as const)
      : ("unauthenticated" as const),
    update: updateUser,
  };
}

// Global drop-in helpers for signOut / signIn
export function signOut(options?: { callbackUrl?: string }) {
  Cookies.remove("refresh_token_cookies");
  Cookies.remove("access_token");
  Cookies.remove("user_role");
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("cp_user");
    window.location.href = options?.callbackUrl || "/login";
  }
}

export function signIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
