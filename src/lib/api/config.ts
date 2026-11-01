/**
 * Centralised API base URL.
 * 
 * - In the browser:
 *   If accessed on the production domain (thecirclepass.com), ALWAYS use https://api.thecirclepass.com/api
 *   If accessed on local network/localhost, use NEXT_PUBLIC_API_URL or fall back to current host:8000.
 * 
 * - On the server:
 *   Inside Docker production, use internal network http://backend:8000/api
 *   Inside local development, use http://127.0.0.1:8000/api
 */
const isServer = typeof window === 'undefined';

function resolveApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Production web domain
    if (host === 'thecirclepass.com' || host === 'www.thecirclepass.com' || host.endsWith('.thecirclepass.com')) {
      return 'https://api.thecirclepass.com/api';
    }
    // Mobile or desktop testing via local IP (e.g. 192.168.x.x)
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  // Server-side
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api';
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
  return envUrl.replace('localhost', '127.0.0.1');
}

export const API_URL = resolveApiUrl();

/**
 * Resolves media / asset base URL (e.g. for uploaded images/avatars)
 */
export function getMediaBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'thecirclepass.com' || host === 'www.thecirclepass.com' || host.endsWith('.thecirclepass.com')) {
      return 'https://api.thecirclepass.com';
    }
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace('/api', '');
}
