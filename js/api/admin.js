import { apiFetch } from './client.js';

export const listAccounts = () => apiFetch('/api/admin/poolparty/account');
export const listRegistrations = () => apiFetch('/api/admin/poolparty/registration');
export const listItems = () => apiFetch('/api/admin/poolparty/item');
export const listVolunteers = () => apiFetch('/api/admin/poolparty/volunteer');

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
