function draftKey(slug, filePath) {
  return `mdock.draft.${slug}.${encodeURIComponent(filePath)}`;
}

function draftHistoryKey(slug, filePath) {
  return `mdock.draft_history.${slug}.${encodeURIComponent(filePath)}`;
}

function vaultDraftsKey(slug) {
  return `mdock.drafts_index.${slug}`;
}

const MAX_HISTORY = 10;
const MAX_AGE_DAYS = 7;
const MAX_DRAFT_SIZE = 100 * 1024; // 100 KB

let memoryFallback = new Map();

function isLocalStorageAvailable() {
  try {
    const test = '__mdock_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function getStorage() {
  if (isLocalStorageAvailable()) {
    return localStorage;
  }
  return null;
}

function readJSON(key, fallback = null) {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  return memoryFallback.get(key) ?? fallback;
}

function writeJSON(key, value) {
  const storage = getStorage();
  const jsonStr = JSON.stringify(value);
  const size = new Blob([jsonStr]).size;
  
  if (size > MAX_DRAFT_SIZE) {
    console.warn(`Draft size (${Math.round(size / 1024)} KB) exceeds recommended limit of ${MAX_DRAFT_SIZE / 1024} KB`);
  }
  
  if (storage) {
    try {
      storage.setItem(key, jsonStr);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded, clearing old drafts...');
        // Try to clear old drafts and retry
        return false;
      }
      return false;
    }
  }
  memoryFallback.set(key, value);
  return true;
}

function removeKey(key) {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(key);
  } else {
    memoryFallback.delete(key);
  }
}

export function saveDraft(slug, filePath, content, baseVersion, baseContent) {
  const now = Date.now();
  const draft = {
    path: filePath,
    content,
    baseVersion,
    baseContent,
    updatedAt: now
  };

  writeJSON(draftKey(slug, filePath), draft);

  const history = readJSON(draftHistoryKey(slug, filePath), []);
  history.unshift({ ...draft });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  writeJSON(draftHistoryKey(slug, filePath), history);

  const index = readJSON(vaultDraftsKey(slug), []);
  if (!index.some((d) => d.path === filePath)) {
    index.push({ path: filePath, updatedAt: now });
    writeJSON(vaultDraftsKey(slug), index);
  }

  return draft;
}

export function loadDraft(slug, filePath) {
  return readJSON(draftKey(slug, filePath));
}

export function loadDraftHistory(slug, filePath) {
  return readJSON(draftHistoryKey(slug, filePath), []);
}

export function deleteDraft(slug, filePath) {
  removeKey(draftKey(slug, filePath));
  removeKey(draftHistoryKey(slug, filePath));

  const index = readJSON(vaultDraftsKey(slug), []);
  const filtered = index.filter((d) => d.path !== filePath);
  writeJSON(vaultDraftsKey(slug), filtered);
}

export function listDrafts(slug) {
  const index = readJSON(vaultDraftsKey(slug), []);
  return index.map(({ path }) => ({
    filePath: path,
    draft: readJSON(draftKey(slug, path))
  })).filter(({ draft }) => draft !== null);
}

export function clearOldDrafts(slug, maxAgeDays = MAX_AGE_DAYS) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const index = readJSON(vaultDraftsKey(slug), []);
  const kept = [];

  for (const { path } of index) {
    const draft = readJSON(draftKey(slug, path));
    if (draft && draft.updatedAt >= cutoff) {
      kept.push({ path, updatedAt: draft.updatedAt });
    } else {
      removeKey(draftKey(slug, path));
      removeKey(draftHistoryKey(slug, path));
    }
  }

  writeJSON(vaultDraftsKey(slug), kept);
  return kept.length;
}