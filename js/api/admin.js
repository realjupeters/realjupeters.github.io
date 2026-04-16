import { apiFetch } from './client.js';

export const listAccounts = () => apiFetch('/api/admin/poolparty/account');
export const listRegistrations = () => apiFetch('/api/admin/poolparty/registration');
export const listItems = () => apiFetch('/api/admin/poolparty/item');
export const listVolunteers = () => apiFetch('/api/admin/poolparty/volunteer');
export const listAuditLogs = () => apiFetch('/api/admin/poolparty/audit');

export const createAccount = ({ name, email, password, roles }) =>
  apiFetch('/api/admin/register', {
    method: 'POST',
    body: { name, email, password, roles },
  });

export const deleteAccount = (id) =>
  apiFetch(`/api/admin/register/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const createItem = (name) =>
  apiFetch('/api/admin/poolparty/item', { method: 'POST', body: { name } });

export const deleteItem = (id) =>
  apiFetch(`/api/admin/poolparty/item/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const deleteRegistration = (id) =>
  apiFetch(`/api/admin/poolparty/registration/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const deleteVolunteer = (id) =>
  apiFetch(`/api/admin/poolparty/volunteer/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ===== Mail drafts =====
export const listMailDrafts = () => apiFetch('/api/admin/mail/draft');

export const getMailDraft = (id) =>
  apiFetch(`/api/admin/mail/draft/${encodeURIComponent(id)}`);

export const createMailDraft = ({ name, subject, html }) =>
  apiFetch('/api/admin/mail/draft', {
    method: 'POST',
    body: { name, subject, html },
  });

export const updateMailDraft = (id, patch) =>
  apiFetch(`/api/admin/mail/draft/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });

export const deleteMailDraft = (id) =>
  apiFetch(`/api/admin/mail/draft/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const sendMailDraftTest = (id) =>
  apiFetch(`/api/admin/mail/draft/${encodeURIComponent(id)}/send-test`, { method: 'POST' });

export const sendMailDraftAll = (id) =>
  apiFetch(`/api/admin/mail/draft/${encodeURIComponent(id)}/send-all`, { method: 'POST' });
