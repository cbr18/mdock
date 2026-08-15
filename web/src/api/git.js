import { api } from './client.js';

export function getStatus(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/git/status`);
}

export function getCommits(slug, limit = 20) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/git/commits?limit=${encodeURIComponent(limit)}`);
}

export function getRemote(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/git/remote`);
}

export function setRemote(slug, url) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/git/remote`, {
    method: 'PUT',
    body: JSON.stringify({ url })
  });
}

export function pushRemote(slug) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/git/push`, { method: 'POST' });
}
