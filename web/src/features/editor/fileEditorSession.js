import {
  acquireFileLock,
  heartbeatFileLock,
  readFileContent,
  releaseFileLock,
  releaseFileLockKeepalive,
  writeFileContent
} from '../../api/files.js';
import { saveDraft, deleteDraft } from '../../api/draftStorage.js';

export function createFileEditorSession({
  slug,
  path,
  api = defaultFilesAPI,
  heartbeatMs = 15000,
  owner = createEditorOwnerToken(),
  timers = defaultTimers(),
  onHeartbeatError = () => {},
  onConflict = () => {}
}) {
  let heartbeatID = null;
  let opened = false;
  let lastServerContent = '';
  let lastServerVersion = null;
  let pendingHeartbeat = null;

  async function open() {
    await api.acquireFileLock(slug, path, owner);
    opened = true;
    try {
      const payload = await api.readFileContent(slug, path);
      lastServerContent = payload.content ?? '';
      lastServerVersion = payload.modified_at ?? payload.version ?? null;
      startHeartbeat();
      return payload;
    } catch (error) {
      await close();
      throw error;
    }
  }

  async function save(content) {
    if (!opened) {
      await api.acquireFileLock(slug, path, owner);
      opened = true;
      startHeartbeat();
    }
    try {
      const result = await api.writeFileContent(slug, path, content, owner);
      lastServerContent = content;
      lastServerVersion = result.modified_at ?? result.version ?? null;
      deleteDraft(slug, path);
      return result;
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      if (status === 409 || status === 423) {
        const draft = saveDraft(slug, path, content, lastServerVersion, lastServerContent);
        const conflictError = new Error('Conflict');
        conflictError.code = 'conflict';
        conflictError.draft = draft;
        conflictError.serverStatus = status;
        onConflict(conflictError);
        throw conflictError;
      }
      throw error;
    }
  }

  async function close() {
    stopHeartbeat();
    if (!opened) return;
    opened = false;
    await api.releaseFileLock(slug, path, owner).catch(() => null);
  }

  function releaseForPageHide() {
    stopHeartbeat();
    if (!opened) return;
    opened = false;
    api.releaseFileLockKeepalive(slug, path, owner);
  }

  function startHeartbeat() {
    stopHeartbeat();
    scheduleHeartbeat();
  }

  function scheduleHeartbeat() {
    if (pendingHeartbeat) return;
    if (!opened) return;

    // Set heartbeatID to a sentinel so stopHeartbeat can clear it
    heartbeatID = 'pending';
    pendingHeartbeat = api.heartbeatFileLock(slug, path, owner);
    pendingHeartbeat
      .catch((error) => {
        onHeartbeatError(error);
        const status = error?.response?.status ?? error?.status;
        if (status === 409 || status === 423) {
          stopHeartbeat();
          opened = false;
        }
      })
      .finally(() => {
        pendingHeartbeat = null;
        if (opened) {
          heartbeatID = timers.setTimeout(scheduleHeartbeat, heartbeatMs);
        } else {
          heartbeatID = null;
        }
      });
  }

  function stopHeartbeat() {
    if (heartbeatID !== null && heartbeatID !== 'pending') {
      timers.clearTimeout(heartbeatID);
    }
    heartbeatID = null;
    pendingHeartbeat = null;
  }

  return {
    open,
    save,
    close,
    releaseForPageHide,
    isOpen: () => opened,
    owner: () => owner
  };
}

const defaultFilesAPI = {
  acquireFileLock,
  heartbeatFileLock,
  readFileContent,
  releaseFileLock,
  releaseFileLockKeepalive,
  writeFileContent
};

function defaultTimers() {
  return {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window)
  };
}

function createEditorOwnerToken() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  return `editor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
