/**
 * Centralised API base URL.
 * In the browser (client components), we use localhost (or the original NEXT_PUBLIC_API_URL) 
 * so CORS and browser network policies work normally.
 * On the Node.js server (server components), we force 127.0.0.1 to avoid IPv6 `::1` connection refused errors.
 */
const isServer = typeof window === 'undefined';
const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const API_URL = isServer ? envUrl.replace('localhost', '127.0.0.1') : envUrl;
