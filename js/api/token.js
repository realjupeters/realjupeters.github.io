const KEY = 'poolparty_session_token';

export function getSessionToken() {
  return localStorage.getItem(KEY);
}

export function setSessionToken(token) {
  if (token) localStorage.setItem(KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(KEY);
}
