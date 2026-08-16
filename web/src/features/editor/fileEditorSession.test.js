import { describe, expect, test, vi } from 'vitest';
import { createFileEditorSession } from './fileEditorSession.js';

function createAPI(overrides = {}) {
  return {
    acquireFileLock: vi.fn().mockResolvedValue({ lock: {} }),
    heartbeatFileLock: vi.fn().mockResolvedValue({}),
    readFileContent: vi.fn().mockResolvedValue({ content: '# Note' }),
    releaseFileLock: vi.fn().mockResolvedValue({}),
    writeFileContent: vi.fn().mockResolvedValue({ file: { path: 'note.md' } }),
    ...overrides
  };
}

describe('file editor session', () => {
  test('acquires lock before reading and releases on close', async () => {
    const api = createAPI();
    const timers = { setInterval: vi.fn(() => 1), clearInterval: vi.fn() };
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, timers });

    await expect(session.open()).resolves.toEqual({ content: '# Note' });
    expect(api.acquireFileLock).toHaveBeenCalledWith('vault', 'note.md');
    expect(api.readFileContent).toHaveBeenCalledWith('vault', 'note.md');
    expect(timers.setInterval).toHaveBeenCalled();
    expect(session.isOpen()).toBe(true);

    await session.close();
    expect(timers.clearInterval).toHaveBeenCalledWith(1);
    expect(api.releaseFileLock).toHaveBeenCalledWith('vault', 'note.md');
    expect(session.isOpen()).toBe(false);
  });

  test('releases lock when read after lock fails', async () => {
    const api = createAPI({ readFileContent: vi.fn().mockRejectedValue(new Error('read_failed')) });
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api });

    await expect(session.open()).rejects.toThrow('read_failed');
    expect(api.releaseFileLock).toHaveBeenCalledWith('vault', 'note.md');
    expect(session.isOpen()).toBe(false);
  });

  test('keeps session open when save fails so dirty content can be retried', async () => {
    const error = new Error('locked');
    error.status = 423;
    const api = createAPI({ writeFileContent: vi.fn().mockRejectedValue(error) });
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api });

    await session.open();
    await expect(session.save('changed')).rejects.toThrow('locked');
    expect(session.isOpen()).toBe(true);
  });

  test('reports heartbeat errors and stops heartbeat', async () => {
    let heartbeat;
    const api = createAPI({ heartbeatFileLock: vi.fn().mockRejectedValue(new Error('lost_lock')) });
    const timers = {
      setInterval: vi.fn((fn) => {
        heartbeat = fn;
        return 7;
      }),
      clearInterval: vi.fn()
    };
    const onHeartbeatError = vi.fn();
    const session = createFileEditorSession({ slug: 'vault', path: 'note.md', api, timers, onHeartbeatError });

    await session.open();
    await heartbeat();

    expect(onHeartbeatError).toHaveBeenCalled();
    expect(timers.clearInterval).toHaveBeenCalledWith(7);
  });
});
