import {
  acquireFileLock,
  heartbeatFileLock,
  readFileContent,
  releaseFileLock,
  releaseFileLockKeepalive,
  writeFileContent
} from '../../api/files.js';

export function createFileEditorSession({
  slug,
  path,
  api = defaultFilesAPI,
  heartbeatMs = 15000,
  owner = createEditorOwnerToken(),
  timers = defaultTimers(),
  onHeartbeatError = () => {}
}) {
  let heartbeatID = null;
  let opened = false;

  async function open() {
    await api.acquireFileLock(slug, path, owner);
    opened = true;
    try {
      const payload = await api.readFileContent(slug, path);
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
    return api.writeFileContent(slug, path, content, owner);
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
    heartbeatID = timers.setInterval(async () => {
      try {
        await api.heartbeatFileLock(slug, path, owner);
      } catch (error) {
        onHeartbeatError(error);
        stopHeartbeat();
      }
    }, heartbeatMs);
  }

  function stopHeartbeat() {
    if (heartbeatID === null) return;
    timers.clearInterval(heartbeatID);
    heartbeatID = null;
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
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window)
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
