import { apiFetch } from './client.js';

export const login = (email, password) =>
  apiFetch('/api/public/login', { method: 'POST', body: { email, password } });

export const requestPasswordReset = (email) =>
  apiFetch('/api/public/sendPasswordReset', { method: 'POST', body: { email } });

export const resetPassword = (token, password) =>
  apiFetch('/api/public/resetPassword', { method: 'POST', body: { token, password } });

export const verifyEmail = (token) =>
  apiFetch('/api/public/verifyEmail', { method: 'POST', body: { token } });

export const changePassword = (currentPassword, newPassword) =>
  apiFetch('/api/private/changePassword', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
