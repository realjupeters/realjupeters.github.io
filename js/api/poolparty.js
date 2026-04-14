import { apiFetch } from './client.js';

export const getMe = () => apiFetch('/api/private/poolparty/me');

export const listItems = () => apiFetch('/api/private/poolparty/item');

export const createRegistration = ({ peopleCount, itemId, music }) =>
  apiFetch('/api/private/poolparty/registration', {
    method: 'POST',
    body: { peopleCount, itemId, music },
  });

export const updateRegistration = (patch) =>
  apiFetch('/api/private/poolparty/registration', { method: 'PATCH', body: patch });

export const deleteRegistration = () =>
  apiFetch('/api/private/poolparty/registration', { method: 'DELETE' });

export const createVolunteer = (duration) =>
  apiFetch('/api/private/poolparty/volunteer', {
    method: 'POST',
    body: { duration },
  });

export const deleteVolunteer = () =>
  apiFetch('/api/private/poolparty/volunteer', { method: 'DELETE' });
