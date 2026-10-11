export interface FilesAPI {
  acquireFileLock(slug: string, path: string, owner: string): Promise<void>;
  heartbeatFileLock(slug: string, path: string, owner: string): Promise<void>;
  readFileContent(slug: string, path: string): Promise<{ content: string; modified_at?: number; version?: string }>;
  releaseFileLock(slug: string, path: string, owner: string): Promise<void>;
  releaseFileLockKeepalive(slug: string, path: string, owner: string): Promise<void>;
  writeFileContent(slug: string, path: string, content: string, owner: string): Promise<{ modified_at?: number; version?: string }>;
}

export interface DraftStorage {
  saveDraft(slug: string, path: string, content: string, baseVersion: string | null, baseContent: string): Promise<void>;
  deleteDraft(slug: string, path: string): Promise<void>;
}

export interface Timers {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface EditorOwnerToken {
  value: string;
}

export interface FileEditorSession {
  open(): Promise<{ content: string; modified_at?: number; version?: string }>;
  save(content: string): Promise<{ modified_at?: number; version?: string }>;
  close(): Promise<void>;
  releaseForPageHide(): void;
  isOpen(): boolean;
  owner(): string;
}

export function createFileEditorSession({
  slug,
  path,
  api,
  heartbeatMs = 15000,
  owner = createEditorOwnerToken(),
  timers = defaultTimers(),
  onHeartbeatError = () => {},
  onConflict = () => {},
  onLockLost = () => {},
}: {
  slug: string;
  path: string;
  api: FilesAPI;
  heartbeatMs?: number;
  owner?: string;
  timers?: Timers;
  onHeartbeatError?: (error: Error) => void;
  onConflict?: (conflictError: ConflictError) => void;
  onLockLost?: (info: { reason: string; message: string }) => void;
}): {
  open: () => Promise<{ content: string; modified_at?: number; version?: string }>;
  save: (content: string) => Promise<{ modified_at?: number; version?: string }>;
  close: () => Promise<void>;
  releaseForPageHide: () => void;
  isOpen: () => boolean;
  owner: () => string;
} {
  let heartbeatID: ReturnType<typeof setTimeout> | null | 'pending' = null;
  let opened = false;
  let lastServerContent = '';
  let lastServerVersion: string | number | null = null;
  let pendingHeartbeat: Promise<void> | null = null;

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

  async function save(content: string) {
    if (!opened) {
      await api.acquireFileLock(slug, path, owner);
      opened = true;
      startHeartbeat();
    }
    try {
      const result = await api.writeFileContent(slug, path, content, owner);
      lastServerContent = content;
      lastServerVersion = result.modified_at ?? result.version ?? null;
      return result;
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      if (status === 409 || status === 423) {
        // Conflict handling should be done by the caller
        const conflictError = new Error('Conflict') as ConflictError;
        conflictError.code = 'conflict';
        conflictError.status = status;
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

    heartbeatID = 'pending';
    pendingHeartbeat = api.heartbeatFileLock(slug, path, owner);
    pendingHeartbeat
      .catch((error) => {
        onHeartbeatError(error);
        const status = error?.response?.status ?? error?.status;
        if (status === 409 || status === 423) {
          stopHeartbeat();
          opened = false;
          if (status === 423) {
            onLockLost({ reason: 'locked_elsewhere', message: 'Файл открыт в другой вкладке или сессии' });
          }
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
    owner: () => owner,
  };
}

export interface ConflictError extends Error {
  code: string;
  status: number;
  draft?: {
    content: string;
    baseVersion: string | null;
    baseContent: string;
  };
}

function defaultTimers() {
  return {
    setTimeout: (fn: () => void, ms: number) => window.setTimeout(fn, ms),
    clearTimeout: (id: number) => window.clearTimeout(id),
  };
}

function createEditorOwnerToken(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  return `editor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}