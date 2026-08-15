import { api } from './client.js';

export function listUsers() {
  return api('/api/admin/users');
}

export function createUser(username, password) {
  return api('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function setUserPassword(login, password) {
  return api(`/api/admin/users/${encodeURIComponent(login)}/password`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export function disableUser(login) {
  return api(`/api/admin/users/${encodeURIComponent(login)}/disable`, { method: 'POST' });
}

export function enableUser(login) {
  return api(`/api/admin/users/${encodeURIComponent(login)}/enable`, { method: 'POST' });
}

export function revokeUserSessions(login) {
  return api(`/api/admin/users/${encodeURIComponent(login)}/sessions/revoke`, { method: 'POST' });
}
