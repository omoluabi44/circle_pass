/**
 * fetchWithAuth — authenticated fetch wrapper with automatic JWT refresh.
 *
 * On a 401 response the wrapper:
 *   1. Attempts a silent token refresh using the refresh token stored in cookies / localStorage.
 *   2. If refresh succeeds, retries the original request with the new access token and
 *      persists the new token so the rest of the app stays in sync.
 *   3. If refresh fails (token also expired / revoked), clears the session and redirects
 *      to /login so the user can re-authenticate cleanly.
 *
 * Usage:
 *   import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
 *   const res = await fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` }, ... });
 */

import Cookies from "js-cookie";
import { API_URL } from "./config";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    Cookies.get("refresh_token_cookies") ||
    localStorage.getItem("refresh_token") ||
    null
  );
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    Cookies.get("access_token") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

/** Decode a JWT payload without verifying the signature (client-side only). */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return null;
  }
}

/** Returns the token expiry as a Unix timestamp in seconds, or null if unknown. */
export function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" ? payload.exp : null;
}

/** True when the token is expired or will expire within `leewaySeconds`. */
export function isTokenExpired(token: string, leewaySeconds = 60): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false; // opaque/undecodable token — assume still valid
  return exp * 1000 - leewaySeconds * 1000 <= Date.now();
}

function persistNewAccessToken(accessToken: string): void {
  if (typeof window === "undefined") return;
  const isHttps = window.location.protocol === "https:";
  Cookies.set("access_token", accessToken, {
    expires: 7,
    secure: isHttps,
    sameSite: "lax",
  });
  localStorage.setItem("accessToken", accessToken);
  // Notify any listeners (e.g. AuthContext) so the in-memory token updates too
  window.dispatchEvent(
    new CustomEvent("cp:token-refreshed", { detail: { accessToken } })
  );
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  Cookies.remove("access_token");
  Cookies.remove("refresh_token_cookies");
  Cookies.remove("user_role");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("cp_user");
  localStorage.removeItem("refresh_token");
}

// ── Token refresh (singleton promise to prevent concurrent refreshes) ────────

let refreshPromise: Promise<RefreshResult> | null = null;

export type RefreshResult =
  | { token: string; reason: "ok" | "not_needed" }
  | { token: null; reason: "missing" | "invalid" | "network" };

async function performRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { token: null, reason: "missing" };

  try {
    const res = await fetch(`${API_URL}/auth/jwt/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) return { token: null, reason: "invalid" };

    const data = await res.json();
    const newAccess: string | undefined = data.access;
    if (!newAccess) return { token: null, reason: "invalid" };

    persistNewAccessToken(newAccess);
    return { token: newAccess, reason: "ok" };
  } catch {
    return { token: null, reason: "network" };
  }
}

/** Call once; concurrent callers share the same in-flight promise. */
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Resolve an access token that is safe to use right now.
 *
 * - If the stored token is still valid, it is returned as-is.
 * - If it is expired (or about to expire), a silent refresh is attempted.
 * - If the refresh truly failed (no refresh token / rejected), null is returned so
 *   the caller can treat the session as unauthenticated.
 * - On a network error the existing token is returned so temporary offline states
 *   don't log the user out.
 */
export async function getValidAccessToken(fallback?: string | null): Promise<string | null> {
  const stored = getAccessToken() || fallback || null;

  // No access token at all — but a refresh token can still restore the session.
  if (!stored) {
    if (!getRefreshToken()) return null;
    const result = await refreshSession();
    return result.token ?? null;
  }

  // A token we can't decode is corrupt / from another environment — refresh it.
  const expiry = getTokenExpiry(stored);
  if (expiry !== null && !isTokenExpired(stored)) return stored;

  const result = await refreshSession();
  if (result.token) return result.token;
  if (result.reason === "network") return stored;
  return null;
}

export function clearAuthSession(): void {
  clearSession();
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for `fetch` that transparently refreshes the JWT on 401.
 * Pass the same arguments as native `fetch`.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // First attempt
  let res = await fetch(input, init);

  // Only intercept 401 responses
  if (res.status !== 401) return res;

  // Peek at the body to confirm it's a token error (not a permissions error)
  const cloned = res.clone();
  let isTokenError = false;
  try {
    const body = await cloned.json();
    const detail: string = body?.detail || body?.error || "";
    isTokenError =
      detail.toLowerCase().includes("token") ||
      detail.toLowerCase().includes("not valid") ||
      detail.toLowerCase().includes("invalid") ||
      detail.toLowerCase().includes("expired");
  } catch {
    isTokenError = true; // assume token error if body isn't parseable
  }

  if (!isTokenError) return res; // permission 401 — don't refresh

  // Attempt silent refresh
  const refreshResult = await refreshSession();
  const newToken = refreshResult.token;

  if (!newToken) {
    // Only clear the session when the refresh token is genuinely unusable.
    // A network blip should not log the user out.
    if (refreshResult.reason === "network") return res;

    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login?reason=session_expired";
    }
    return res; // return the original 401 (caller won't see it due to redirect)
  }

  // Retry original request with the new access token
  const newInit: RequestInit = {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${newToken}`,
    },
  };

  return fetch(input, newInit);
}

/**
 * Convenience: build Authorization headers, always using the freshest stored token.
 * Pass the token you have from context; if it has changed in storage, the stored
 * one takes precedence (because storage is always updated after a refresh).
 */
export function authHeaders(token?: string | null): Record<string, string> {
  const best = getAccessToken() || token || "";
  return best ? { Authorization: `Bearer ${best}` } : {};
}
