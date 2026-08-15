import { api } from './client.js';

export function me() {
  return api('/api/auth/me');
}

export function login(username, password) {
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function setupFirstAdmin(username, password, setupToken = '') {
  return api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, setup_token: setupToken })
  });
}

export function logout() {
  return api('/api/auth/logout', { method: 'POST' });
}

export function changePassword(currentPassword, newPassword) {
  return api('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  });
}
