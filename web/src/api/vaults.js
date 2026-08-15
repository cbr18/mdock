import { api } from './client.js';

export function listVaults() {
  return api('/api/vaults');
}

export function createVault(name) {
  return api('/api/vaults', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export function getVault(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}`);
}

export function renameVault(slug, name) {
  return api(`/api/vaults/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name })
  });
}

export function archiveVault(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/archive`, { method: 'POST' });
}

export function unarchiveVault(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/unarchive`, { method: 'POST' });
}

export function getWebDAV(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/webdav`);
}

export function getMembers(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/members`);
}
