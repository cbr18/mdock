import {
  acquireFileLock,
  heartbeatFileLock,
  readFileContent,
  releaseFileLock,
  writeFileContent
} from '../../api/files.js';

export function createFileEditorSession({
  slug,
  path,
  api = defaultFilesAPI,
  heartbeatMs = 15000,
  timers = defaultTimers(),
  onHeartbeatError = () => {}
}) {
  let heartbeatID = null;
  let opened = false;

  async function open() {
    await api.acquireFileLock(slug, path);
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
      await api.acquireFileLock(slug, path);
      opened = true;
      startHeartbeat();
    }
    return api.writeFileContent(slug, path, content);
  }

  async function close() {
    stopHeartbeat();
    if (!opened) return;
    opened = false;
    await api.releaseFileLock(slug, path).catch(() => null);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatID = timers.setInterval(async () => {
      try {
        await api.heartbeatFileLock(slug, path);
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
    isOpen: () => opened
  };
}

const defaultFilesAPI = {
  acquireFileLock,
  heartbeatFileLock,
  readFileContent,
  releaseFileLock,
  writeFileContent
};

function defaultTimers() {
  return {
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window)
  };
}
