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

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    Cookies.get("refresh_token_cookies") ||
    localStorage.getItem("refresh_token") ||
    null
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    Cookies.get("access_token") ||
    localStorage.getItem("accessToken") ||
    null
  );
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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/jwt/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccess: string | undefined = data.access;
    if (!newAccess) return null;

    persistNewAccessToken(newAccess);
    return newAccess;
  } catch {
    return null;
  }
}

/** Call once; concurrent callers share the same in-flight promise. */
function getOrStartRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
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
  const newToken = await getOrStartRefresh();

  if (!newToken) {
    // Refresh failed — clear session and redirect to login
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
