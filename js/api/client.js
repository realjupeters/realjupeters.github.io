import { BASE_URL } from './config.js';
import { getSessionToken } from './token.js';

export class ApiError extends Error {
  constructor(status, body) {
    const message = (body && (body.message || body.error)) || `HTTP ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = (body && body.error) || 'unknown';
    this.body = body || null;
  }
}

/**
 * Single shared fetch wrapper. Sends the httpOnly session cookie via credentials:'include',
 * parses JSON responses, and throws a typed ApiError for non-2xx responses.
 *
 * @param {string} path path starting with /api/...
 * @param {{ method?: string, body?: any }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body } = options;
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const sessionToken = getSessionToken();
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let payload = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    payload = await res.json().catch(() => null);
  }

  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}
