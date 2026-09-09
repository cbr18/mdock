import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as draftStorage from './draftStorage.js';

const originalLocalStorage = global.localStorage;

function createMockStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, value)),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear())
  };
}

beforeEach(() => {
  global.localStorage = createMockStorage();
  vi.resetModules();
});

afterEach(() => {
  global.localStorage = originalLocalStorage;
});

describe('draftStorage', () => {
  test('saveDraft writes to localStorage', async () => {
    const { saveDraft, loadDraft } = await import('./draftStorage.js');

    const draft = saveDraft('test-vault', 'notes/test.md', '# Hello\nWorld', 'v1', '# Hello');

    expect(draft.path).toBe('notes/test.md');
    expect(draft.content).toBe('# Hello\nWorld');
    expect(draft.baseVersion).toBe('v1');
    expect(draft.baseContent).toBe('# Hello');
    expect(draft.updatedAt).toBeTypeOf('number');

    const loaded = loadDraft('test-vault', 'notes/test.md');
    expect(loaded).toEqual(draft);
  });

  test('saveDraft adds to history', async () => {
    const { saveDraft, loadDraftHistory } = await import('./draftStorage.js');

    saveDraft('vault', 'a.md', 'content1', 'v1', 'base1');
    saveDraft('vault', 'a.md', 'content2', 'v2', 'base2');

    const history = loadDraftHistory('vault', 'a.md');
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('content2');
    expect(history[1].content).toBe('content1');
  });

  test('history is capped at MAX_HISTORY', async () => {
    const { saveDraft, loadDraftHistory } = await import('./draftStorage.js');

    for (let i = 0; i < 15; i++) {
      saveDraft('vault', 'a.md', `content${i}`, `v${i}`, `base${i}`);
    }

    const history = loadDraftHistory('vault', 'a.md');
    expect(history.length).toBeLessThanOrEqual(10);
  });

  test('deleteDraft removes draft and history', async () => {
    const { saveDraft, deleteDraft, loadDraft, loadDraftHistory } = await import('./draftStorage.js');

    saveDraft('vault', 'a.md', 'content', 'v1', 'base');
    deleteDraft('vault', 'a.md');

    expect(loadDraft('vault', 'a.md')).toBeNull();
    expect(loadDraftHistory('vault', 'a.md')).toEqual([]);
  });

  test('listDrafts returns all drafts for vault', async () => {
    const { saveDraft, listDrafts } = await import('./draftStorage.js');

    saveDraft('vault', 'a.md', 'content1', 'v1', 'base1');
    saveDraft('vault', 'b.md', 'content2', 'v2', 'base2');

    const drafts = listDrafts('vault');
    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.filePath).sort()).toEqual(['a.md', 'b.md']);
  });

  test('clearOldDrafts removes drafts older than maxAgeDays', async () => {
    const { saveDraft, clearOldDrafts, loadDraft } = await import('./draftStorage.js');

    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const recentTime = Date.now();

    saveDraft('vault', 'old.md', 'old', 'v1', 'base');
    saveDraft('vault', 'recent.md', 'recent', 'v2', 'base');

    await vi.useFakeTimers().setSystemTime(oldTime);
    saveDraft('vault', 'old.md', 'old', 'v1', 'base');
    await vi.useFakeTimers().setSystemTime(recentTime);
    saveDraft('vault', 'recent.md', 'recent', 'v2', 'base');

    const removed = clearOldDrafts('vault', 7);
    expect(removed).toBe(1);
    expect(loadDraft('vault', 'old.md')).toBeNull();
    expect(loadDraft('vault', 'recent.md')).not.toBeNull();
  });

  test('falls back to in-memory when localStorage unavailable', async () => {
    global.localStorage = null;
    vi.resetModules();

    const { saveDraft, loadDraft } = await import('./draftStorage.js');

    const draft = saveDraft('vault', 'a.md', 'content', 'v1', 'base');
    const loaded = loadDraft('vault', 'a.md');

    expect(loaded).toEqual(draft);
  });
});