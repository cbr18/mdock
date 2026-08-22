import { api } from './client.js';

export function listFiles(slug, path = '.') {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files?path=${encodeURIComponent(path || '.')}`);
}

export function readFileContent(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files/content?path=${encodeURIComponent(path)}`);
}

export function createFile(slug, path, content = '') {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files`, {
    method: 'POST',
    body: JSON.stringify({ path, content })
  });
}

export function writeFileContent(slug, path, content, owner = '') {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files/content`, {
    method: 'PUT',
    body: JSON.stringify({ path, content, owner })
  });
}

export function createDirectory(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/dirs`, {
    method: 'POST',
    body: JSON.stringify({ path })
  });
}

export function movePath(slug, fromPath, toPath) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files/move`, {
    method: 'PATCH',
    body: JSON.stringify({ from_path: fromPath, to_path: toPath })
  });
}

export function deletePath(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE'
  });
}

export function acquireFileLock(slug, path, owner = '') {
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks`, {
    method: 'POST',
    body: JSON.stringify({ path, owner })
  });
}

export function heartbeatFileLock(slug, path, owner = '') {
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ path, owner })
  });
}

export function releaseFileLock(slug, path, owner = '') {
  const params = new URLSearchParams({ path });
  if (owner) params.set('owner', owner);
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks?${params.toString()}`, {
    method: 'DELETE'
  });
}

export function releaseFileLockKeepalive(slug, path, owner = '') {
  const params = new URLSearchParams({ path });
  if (owner) params.set('owner', owner);
  const csrfToken = getCookie('mdock_csrf');
  fetch(`/api/vaults/${encodeURIComponent(slug)}/locks?${params.toString()}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    keepalive: true,
    headers: {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
    }
  }).catch(() => null);
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
}
