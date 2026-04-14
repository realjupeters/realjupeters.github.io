import { apiFetch, ApiError } from './client.js';

/**
 * Returns the currently authenticated user object, or null if no valid session exists.
 * The server is the source of truth — the frontend no longer parses tokens or tracks state.
 */
export async function getCurrentUser() {
  try {
    return await apiFetch('/api/private/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function isAdmin(user) {
  return !!(user && Array.isArray(user.roles) && user.roles.includes('admin'));
}

export async function logout() {
  try {
    await apiFetch('/api/public/logout', { method: 'POST' });
  } catch {
    // Even if the request fails, the cookie is cleared client-side by the browser on navigation.
  }
}
