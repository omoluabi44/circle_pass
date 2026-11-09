/**
 * Installs a global `fetch` interceptor that makes every authenticated request
 * self-healing.
 *
 * Why this exists: many pages call `fetch()` directly instead of going through
 * `fetchWithAuth`. When a stored access token is expired (or was invalidated
 * server-side), those calls used to fail with
 * `{"detail":"Given token not valid for any token type"}` and the UI showed
 * "Failed to fetch …" errors. This interceptor catches that case for *all*
 * requests — regardless of where they are made — silently refreshes the token,
 * and retries once.
 *
 * Behaviour:
 *   - `Authorization: Bearer undefined|null|` is repaired before sending.
 *   - A 401 token error from our API triggers a refresh + single retry.
 *   - If the refresh token is unusable, the session is cleared and the user is
 *     sent to /login (never left on a page where every request fails).
 *   - The refresh endpoint itself is never intercepted (avoids recursion).
 */

import { API_URL } from "./config";
import {
  clearAuthSession,
  getAccessToken,
  refreshSession,
} from "./fetchWithAuth";

const REFRESH_PATH = "/auth/jwt/refresh/";

let installed = false;
let installedFetch: typeof window.fetch | null = null;

function toAbsoluteUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) return input;
    if (typeof input === "string") return new URL(input, window.location.href);
    if (input instanceof Request) return new URL(input.url, window.location.href);
  } catch {
    /* ignore */
  }
  return null;
}

function isTokenErrorBody(body: any): boolean {
  const detail: string = body?.detail || body?.error || body?.message || "";
  const code: string = body?.code || "";
  return (
    code === "token_not_valid" ||
    detail.toLowerCase().includes("token") ||
    detail.toLowerCase().includes("not valid") ||
    detail.toLowerCase().includes("invalid") ||
    detail.toLowerCase().includes("expired")
  );
}

function sendToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (/^\/(login|register)/.test(pathname)) return;
  const callbackUrl = encodeURIComponent(pathname + search);
  window.location.href = `/login?reason=session_expired&callbackUrl=${callbackUrl}`;
}

/** Replace `Bearer undefined` / `Bearer null` / empty auth headers with a real token. */
function repairAuthHeader(headers: Headers): void {
  const auth = headers.get("Authorization");
  if (!auth) return;
  const match = /^Bearer\s*(.*)$/i.exec(auth.trim());
  if (!match) return;
  const value = (match[1] || "").trim();
  if (value && value !== "undefined" && value !== "null") return;

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }
}

export function installAuthFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const original = window.fetch.bind(window);
  installedFetch = original;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = toAbsoluteUrl(input);
    const isApiRequest = !!url && url.href.startsWith(API_URL);

    // Never intercept the refresh call itself — it would recurse into itself.
    if (url && url.pathname.endsWith(REFRESH_PATH)) {
      return original(input, init);
    }

    // Build a reusable Request so we can retry with a body intact.
    let request: Request | null = null;
    try {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      repairAuthHeader(headers);

      request = new Request(
        input instanceof Request ? input.clone() : input,
        { ...init, headers }
      );
    } catch {
      request = null;
    }

    const res = request
      ? await original(request.clone())
      : await original(input, init);

    if (res.status !== 401 || !isApiRequest || !request) return res;

    // Confirm the 401 is about the token, not permissions.
    let tokenError = false;
    try {
      tokenError = isTokenErrorBody(await res.clone().json());
    } catch {
      tokenError = true;
    }
    if (!tokenError) return res;

    const result = await refreshSession();
    if (!result.token) {
      if (result.reason !== "network") {
        clearAuthSession();
        sendToLogin();
      }
      return res;
    }

    // Retry once with the refreshed token.
    try {
      const retryHeaders = new Headers(request.headers);
      retryHeaders.set("Authorization", `Bearer ${result.token}`);
      const retry = new Request(request, { headers: retryHeaders });
      return await original(retry);
    } catch {
      return res;
    }
  };
}

/** Test/teardown helper — restores the original `fetch`. */
export function uninstallAuthFetchInterceptor(): void {
  if (!installed || typeof window === "undefined") return;
  if (installedFetch) window.fetch = installedFetch;
  installed = false;
  installedFetch = null;
}
