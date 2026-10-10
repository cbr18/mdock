import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock only CodeMirror imports to avoid resolution issues in tests
// The @mdock/editor library uses these internally but we don't want to mock the whole library
vi.mock('@codemirror/basic-setup', () => ({
  basicSetup: [],
  EditorView: class EditorView {
    constructor() { this.state = { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } }; }
    dispatch() {}
    destroy() {}
    focus() {}
  },
  EditorState: class EditorState {
    static create() { return { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } }; }
  },
  basicSetup: [],
}));

vi.mock('@codemirror/state', () => ({
  EditorState: class EditorState {
    static create() { return { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } }; }
  },
  EditorSelection: vi.fn(),
  StateEffect: vi.fn(),
  StateField: vi.fn(),
  Prec: { highest: vi.fn((x) => x) },
  Transaction: vi.fn(),
}));

vi.mock('@codemirror/view', () => ({
  EditorView: class EditorView {
    constructor() { this.state = { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } }; }
    dispatch() {}
    destroy() {}
    focus() {}
  },
  Decoration: vi.fn(),
  keymap: vi.fn((x) => x),
  WidgetType: class WidgetType {},
}));

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(),
  markdownLanguage: vi.fn(),
}));

vi.mock('@codemirror/language', () => ({
  LanguageSupport: vi.fn(),
}));

vi.mock('@codemirror/commands', () => ({
  history: vi.fn(() => []),
  undo: vi.fn(),
  redo: vi.fn(),
}));

vi.mock('@lezer/markdown', () => ({}));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ children }) => children || null,
}));

if (typeof localStorage === 'undefined' || localStorage === null) {
  const store = new Map();
  const memoryStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* iterator() {}
  });
}
