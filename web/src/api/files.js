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

export function writeFileContent(slug, path, content) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/files/content`, {
    method: 'PUT',
    body: JSON.stringify({ path, content })
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

export function acquireFileLock(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks`, {
    method: 'POST',
    body: JSON.stringify({ path })
  });
}

export function heartbeatFileLock(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ path })
  });
}

export function releaseFileLock(slug, path) {
  return api(`/api/vaults/${encodeURIComponent(slug)}/locks?path=${encodeURIComponent(path)}`, {
    method: 'DELETE'
  });
}
