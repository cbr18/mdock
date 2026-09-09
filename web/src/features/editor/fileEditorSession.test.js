import { describe, expect, test, vi, beforeEach } from 'vitest';
import { createFileEditorSession } from './fileEditorSession.js';

function createAPI(overrides = {}) {
  return {
    acquireFileLock: vi.fn().mockResolvedValue({ lock: {} }),
    heartbeatFileLock: vi.fn().mockResolvedValue({}),
    readFileContent: vi.fn().mockResolvedValue({ content: '# Note' }),
    releaseFileLock: vi.fn().mockResolvedValue({}),
    releaseFileLockKeepalive: vi.fn(),
    writeFileContent: vi.fn().mockResolvedValue({ file: { path: 'note.md' } }),
    ...overrides
  };
}

describe('file editor session', () => {
  test('acquires lock before reading and releases on close', async () => {
    const api = createAPI();
    let timeoutId = 0;
    const timers = {
      setTimeout: vi.fn((fn) => { timeoutId++; return timeoutId; }),
      clearTimeout: vi.fn()
    };
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, timers, owner: 'tab-a' });

    await expect(session.open()).resolves.toEqual({ content: '# Note' });
    expect(api.acquireFileLock).toHaveBeenCalledWith('vault', 'note.md', 'tab-a');
    expect(api.readFileContent).toHaveBeenCalledWith('vault', 'note.md');
    expect(timers.setTimeout).toHaveBeenCalled();
    expect(session.isOpen()).toBe(true);

    await session.close();
    expect(timers.clearTimeout).toHaveBeenCalled();
    expect(api.releaseFileLock).toHaveBeenCalledWith('vault', 'note.md', 'tab-a');
    expect(session.isOpen()).toBe(false);
  });

  test('uses keepalive release for pagehide without async release', async () => {
    const api = createAPI();
    let timeoutId = 0;
    const timers = {
      setTimeout: vi.fn((fn) => { timeoutId++; return timeoutId; }),
      clearTimeout: vi.fn()
    };
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, timers, owner: 'tab-a' });

    await session.open();
    // Allow heartbeat promise chain to complete
    await Promise.resolve();
    session.releaseForPageHide();

    expect(timers.clearTimeout).toHaveBeenCalled();
    expect(api.releaseFileLockKeepalive).toHaveBeenCalledWith('vault', 'note.md', 'tab-a');
    expect(api.releaseFileLock).not.toHaveBeenCalled();
    expect(session.isOpen()).toBe(false);

    await session.close();
    expect(api.releaseFileLock).not.toHaveBeenCalled();
  });

  test('releases lock when read after lock fails', async () => {
    const api = createAPI({ readFileContent: vi.fn().mockRejectedValue(new Error('read_failed')) });
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, owner: 'tab-a' });

    await expect(session.open()).rejects.toThrow('read_failed');
    expect(api.releaseFileLock).toHaveBeenCalledWith('vault', 'note.md', 'tab-a');
    expect(session.isOpen()).toBe(false);
  });

  test('keeps session open when save fails so dirty content can be retried', async () => {
    const error = new Error('Conflict');
    error.status = 423;
    error.response = { status: 423 };
    const api = createAPI({ writeFileContent: vi.fn().mockRejectedValue(error) });
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, owner: 'tab-a' });

    await session.open();
    await expect(session.save('changed')).rejects.toThrow('Conflict');
    expect(api.writeFileContent).toHaveBeenCalledWith('vault', 'note.md', 'changed', 'tab-a');
    expect(session.isOpen()).toBe(true);
  });

test('reports heartbeat errors and stops heartbeat on 409/423', async () => {
    const api = createAPI({ heartbeatFileLock: vi.fn().mockRejectedValue({ response: { status: 409 } }) });
    const timers = {
      setTimeout: vi.fn((fn) => { fn(); return 1; }),
      clearTimeout: vi.fn()
    };
    const onHeartbeatError = vi.fn();
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, timers, onHeartbeatError, owner: 'tab-a' });

    await session.open();
    await Promise.resolve();

    expect(api.heartbeatFileLock).toHaveBeenCalledWith('vault', 'note.md', 'tab-a');
    expect(onHeartbeatError).toHaveBeenCalled();
    // On 409, session closes immediately - no timer was scheduled, so clearTimeout not called
    expect(session.isOpen()).toBe(false);
  });

  test('generates a lock owner token when one is not provided', () => {
    const api = createAPI();
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api });

    expect(session.owner()).toEqual(expect.any(String));
    expect(session.owner().length).toBeGreaterThan(8);
  });

  test('saves draft on conflict (409) and calls onConflict', async () => {
    const error = new Error('Conflict');
    error.status = 409;
    error.response = { status: 409 };
    const api = createAPI({ writeFileContent: vi.fn().mockRejectedValue(error) });
    const onConflict = vi.fn();
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, onConflict, owner: 'tab-a' });

    await session.open();
    await expect(session.save('new content')).rejects.toThrow('Conflict');

    expect(onConflict).toHaveBeenCalled();
    const conflictError = onConflict.mock.calls[0][0];
    expect(conflictError.code).toBe('conflict');
    expect(conflictError.serverStatus).toBe(409);
    expect(conflictError.draft).toBeDefined();
    expect(conflictError.draft.content).toBe('new content');
    expect(conflictError.draft.baseVersion).toBeDefined();
    expect(conflictError.draft.baseContent).toBe('# Note');
  });

  test('deletes draft on successful save', async () => {
    const api = createAPI({ writeFileContent: vi.fn().mockResolvedValue({ modified_at: 12345 }) });
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, owner: 'tab-a' });

    await session.open();
    await session.save('updated content');

    expect(api.writeFileContent).toHaveBeenCalledWith('vault', 'note.md', 'updated content', 'tab-a');
    expect(session.isOpen()).toBe(true);
  });
});