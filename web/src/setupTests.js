import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Comprehensive CodeMirror mocks to satisfy both transform-time import analysis and runtime tests

// @codemirror/basic-setup
vi.mock('@codemirror/basic-setup', () => ({
  basicSetup: [],
  EditorView: class EditorView {
    constructor() {
      this.state = {
        doc: { toString: () => '', length: 0, lines: 1 },
        selection: { main: { from: 0, to: 0, anchor: 0, head: 0, empty: true } },
      };
      this._plugins = [];
    }
    dispatch(tr) {
      if (tr?.state) this.state = tr.state;
      if (tr?.effects) this._effects = tr.effects;
    }
    destroy() {}
    focus() {}
    requestMeasure() {}
    addEventListener() {}
    removeEventListener() {}
    contentDOM = { querySelector: () => null };
  },
  EditorState: class EditorState {
    static create(config = {}) {
      const state = {
        doc: { toString: () => '', length: 0, lines: 1 },
        selection: { main: { from: 0, to: 0, anchor: 0, head: 0, empty: true } },
        plugins: [],
      };
      return state;
    }
  },
}));

// @codemirror/state
vi.mock('@codemirror/state', () => {
  const StateEffect = {
    define: vi.fn(() => ({
      map: vi.fn(),
      is: vi.fn(),
      of: vi.fn((value) => ({ type: 'StateEffect', value })),
    })),
  };
  const StateField = {
    define: vi.fn(() => ({
      create: vi.fn(),
      update: vi.fn(),
      provide: vi.fn(),
    })),
  };
  const Prec = {
    highest: vi.fn((x) => x),
    lowest: vi.fn((x) => x),
  };
  const EditorSelection = {
    single: vi.fn((anchor, head) => ({ anchor: anchor ?? 0, head: head ?? 0 })),
    range: vi.fn((anchor, head) => ({ anchor: anchor ?? 0, head: head ?? 0 })),
  };
  return {
    EditorState: class EditorState {
      static create(config = {}) {
        return {
          doc: { toString: () => '', length: 0, lines: 1 },
          selection: { main: { from: 0, to: 0, anchor: 0, head: 0, empty: true } },
          plugins: [],
          readOnly: config?.readOnly ?? false,
        };
      }
    },
    EditorSelection,
    StateEffect,
    StateField,
    Prec,
    Transaction: vi.fn(),
    Facet: vi.fn(),
  };
});

// @codemirror/view
vi.mock('@codemirror/view', () => ({
  EditorView: class EditorView {
    constructor(config = {}) {
      this.state = config?.state || {
        doc: { toString: () => '', length: 0, lines: 1 },
        selection: { main: { from: 0, to: 0, anchor: 0, head: 0, empty: true } },
      };
      this._plugins = [];
      this._dom = document.createElement('div');
    }
    dispatch(tr) {
      if (tr?.state) this.state = tr.state;
      if (tr?.effects) this._effects = tr.effects;
      if (tr?.selection) this.state.selection = tr.selection;
      if (tr?.scrollIntoView) {}
    }
    destroy() {}
    focus() {}
    requestMeasure() {}
    addEventListener() {}
    removeEventListener() {}
    posAtDOM() { return 0; }
    get contentDOM() { return this._dom; }
  },
  Decoration: {
    set: vi.fn(() => []),
    widget: vi.fn(),
    replace: vi.fn(),
    line: vi.fn(),
  },
  keymap: vi.fn((x) => x),
  WidgetType: class WidgetType {
    eq() { return false; }
    toDOM() { return document.createElement('div'); }
    destroy() {}
    ignoreEvent() { return false; }
  },
  decorations: vi.fn(() => []),
  editorAttributes: vi.fn(() => ({})),
  domEventHandlers: vi.fn(() => ({})),
  theme: vi.fn(() => ({})),
}));

// @codemirror/lang-markdown
vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(() => []),
  markdownLanguage: vi.fn(),
}));

// @codemirror/language
vi.mock('@codemirror/language', () => ({
  LanguageSupport: vi.fn(),
  syntaxHighlighting: vi.fn(),
}));

// @codemirror/commands
vi.mock('@codemirror/commands', () => ({
  history: vi.fn(() => []),
  undo: vi.fn(),
  redo: vi.fn(),
  selectAll: vi.fn(),
}));

// @lezer/markdown
vi.mock('@lezer/markdown', () => ({}));

// @lezer/highlight
vi.mock('@lezer/highlight', () => ({
  HighlightStyle: vi.fn(),
}));

// @lezer/common
vi.mock('@lezer/common', () => ({
  Parser: vi.fn(),
  NodeType: vi.fn(),
}));

// @codemirror/lint
vi.mock('@codemirror/lint', () => ({
  lint: vi.fn(),
  linter: vi.fn(),
}));

// @codemirror/autocomplete
vi.mock('@codemirror/autocomplete', () => ({
  autocompletion: vi.fn(),
}));

// @codemirror/search
vi.mock('@codemirror/search', () => ({
  search: vi.fn(),
}));

// @uiw/react-codemirror
vi.mock('@uiw/react-codemirror', () => ({
  default: (props) => null,
}));

// @mdock/editor/react - mock the React components with proper toolbar rendering
// Translation map for Russian locale used in tests
const ruLabels = {
  'Paragraph': 'Абзац',
  'Inline Formatting': 'Встроенное форматирование',
  'List Formatting': 'Форматирование списков',
  'Insert': 'Вставка',
  'Wikilink': 'Викиссылка',
  'Embed': 'Встраивание',
  'Callout': 'Калл-аут',
  'Metadata': 'Метаданные',
  'heading1': 'Заголовок 1',
  'heading2': 'Заголовок 2',
  'heading3': 'Заголовок 3',
  'heading4': 'Заголовок 4',
  'heading5': 'Заголовок 5',
  'heading6': 'Заголовок 6',
  'quote': 'Цитата',
  'codeBlock': 'Блок кода',
  'bold': 'Жирный',
  'italic': 'Курсив',
  'strikethrough': 'Зачёркнутый',
  'highlight': 'Подсветка',
  'inlineCode': 'Код',
  'comment': 'Комментарий',
  'bulletList': 'Маркированный список',
  'orderedList': 'Нумерованный список',
  'taskList': 'Список задач',
  'taskDone': 'Выполнено',
  'indent': 'Отступ',
  'outdent': 'Уменьшить отступ',
  'link': 'Ссылка',
  'image': 'Изображение',
  'table': 'Таблица',
  'horizontalRule': 'Горизонтальная линия',
  'inlineMath': 'Инлайн-математика',
  'blockMath': 'Блок-математика',
  'footnote': 'Сноска',
};

vi.mock('@mdock/editor/react', () => ({
  MarkdownEditor: ({ value, onChange, readOnly, variant, livePreviewConfig, minHeight, ariaLabel, toolbarConfig }) => {
    // Render a mock toolbar for testing
    if (toolbarConfig && toolbarConfig.groups) {
      return React.createElement('div', { 'data-testid': 'markdown-editor' },
        React.createElement('div', { className: 'editor-toolbar' },
          toolbarConfig.groups.map((group) =>
            React.createElement('div', { key: group.name, className: 'toolbar-menu' },
              React.createElement('button', { type: 'button', className: 'secondary-button', 'aria-label': ruLabels[group.label] || group.label },
                React.createElement('span', null, ruLabels[group.label] || group.label)
              ),
              group.commands.map((cmd) =>
                React.createElement('button', {
                  key: cmd.id,
                  type: 'button',
                  className: 'toolbar-command',
                  'aria-label': ruLabels[cmd.label] || cmd.label,
                  title: ruLabels[cmd.label] || cmd.label,
                  role: 'button',
                  onClick: () => {},
                },
                React.createElement('span', null, ruLabels[cmd.label] || cmd.label)
                )
              )
            )
          )
        )
      );
    }
    return React.createElement('div', { 'data-testid': 'markdown-editor' });
  },
  useMarkdownEditor: vi.fn(() => ({
    editor: {
      view: {
        state: { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } },
        dispatch: vi.fn(),
        focus: vi.fn(),
        destroy: vi.fn(),
      },
      mount: vi.fn(),
      unmount: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: vi.fn(),
    },
    mount: vi.fn(),
    unmount: vi.fn(),
    setValue: vi.fn(),
    getValue: vi.fn(() => ''),
    focus: vi.fn(),
  })),
  ViewPlugin: {
    fromClass: vi.fn((cls) => {
      return {
        plugin: class {
          constructor(view) { this.view = view; }
          update(update) {}
        }
      };
    })
  },
  MarkdownEditorProps: {},
  ToolbarConfig: {},
  UseMarkdownEditorReturn: {},
}));

// @mdock/editor - mock only the internal functions needed by tests
vi.mock('@mdock/editor', () => ({
  MarkdownEditor: ({ value, onChange, readOnly, variant, livePreviewConfig, minHeight, ariaLabel }) => React.createElement('div', { 'data-testid': 'markdown-editor' }),
  useMarkdownEditor: vi.fn(() => ({
    editor: {
      view: {
        state: { doc: { toString: () => '', length: 0 }, selection: { main: { from: 0, to: 0 } } },
        dispatch: vi.fn(),
        focus: vi.fn(),
        destroy: vi.fn(),
      },
      mount: vi.fn(),
      unmount: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: vi.fn(),
    },
    mount: vi.fn(),
    unmount: vi.fn(),
    setValue: vi.fn(),
    getValue: vi.fn(() => ''),
    focus: vi.fn(),
  })),
  livePreviewExtension: vi.fn(() => []),
  createEditorTheme: vi.fn(() => []),
  COMMANDS: {},
  applyCommandToView: vi.fn(() => true),
  initialFormValues: vi.fn(() => ({})),
  PARAM_LABEL_KEYS: {},
  FORM_MENU: {},
  splitBlocks: vi.fn(() => []),
  getSplitBlocks: vi.fn(() => []),
  blockAtPosition: vi.fn(() => null),
  createBlock: vi.fn(),
  RenderedMarkdownBlockWidget: vi.fn(),
  RenderedMarkdownDocumentWidget: vi.fn(),
  cursorPositionFromClick: vi.fn(() => 0),
  activeBlockRange: vi.fn(() => ({ from: 0, to: 0, sourceTo: 0 })),
  isActiveBlock: vi.fn(() => false),
  rangesIntersect: vi.fn(() => false),
  caretFromPoint: vi.fn(() => null),
  splitFrontmatter: vi.fn(() => ({ frontmatter: '', body: '' })),
  // New exports for P0-1, P0-2, P0-5
  wikilinkAutocomplete: vi.fn(() => []),
  mathRenderPlugins: { remark: [], rehype: [] },
  createMathPlugins: vi.fn(() => ({ remark: [], rehype: [] })),
  withMath: vi.fn((config) => config),
  loadKatexStyles: vi.fn(() => Promise.resolve()),
  isKatexAvailable: vi.fn(() => Promise.resolve(true)),
  setFocusedBlock: { of: vi.fn(), map: vi.fn(), is: vi.fn() },
  setActiveBlock: { of: vi.fn(), map: vi.fn(), is: vi.fn() },
  navigateToPage: vi.fn(),
  FocusedBlock: {},
  // New exports for P0-3
  remarkCallout: vi.fn(() => []),
  rehypeCallout: vi.fn(() => []),
  // New exports for P1-1 Embeds
  remarkEmbed: vi.fn(() => []),
  rehypeEmbed: vi.fn(() => []),
  // New exports for P1-2 Mermaid
  remarkMermaid: vi.fn(() => []),
  rehypeMermaid: vi.fn(() => []),
  // New exports for P1-3 Footnotes
  remarkFootnotes: vi.fn(() => []),
  rehypeFootnotes: vi.fn(() => []),
  // Mermaid renderer functions
  initMermaid: vi.fn(() => Promise.resolve()),
  updateMermaidTheme: vi.fn(() => Promise.resolve()),
  autoRenderMermaid: vi.fn(() => Promise.resolve()),
  rerenderAllDiagrams: vi.fn(() => Promise.resolve()),
  copyMermaidAsSvg: vi.fn(() => Promise.resolve()),
  copyMermaidAsPng: vi.fn(() => Promise.resolve()),
  openMermaidFullscreen: vi.fn(() => Promise.resolve()),
  // New exports for P1-4 Heading refs
  slugifyHeading: vi.fn((text) => text.toLowerCase().replace(/\s+/g, '-')),
  extractHeadings: vi.fn(() => []),
  detectHeadingChanges: vi.fn(() => ({ changes: [], currentHeadings: [] })),
  updateWikilinksForHeadingChanges: vi.fn(() => ({ content: '', updated: false })),
  updateWikilinksInPage: vi.fn(() => ({ content: '', updated: false })),
  processHeadingRename: vi.fn(() => ({ content: '', updated: false, changes: [] })),
  computeChanges: vi.fn(() => []),
  HeadingInfo: {},
  HeadingChangeResult: {},
  // Mermaid renderer functions
  initMermaid: vi.fn(() => Promise.resolve()),
  updateMermaidTheme: vi.fn(() => Promise.resolve()),
  autoRenderMermaid: vi.fn(() => Promise.resolve()),
  rerenderAllDiagrams: vi.fn(() => Promise.resolve()),
  copyMermaidAsSvg: vi.fn(() => Promise.resolve()),
  copyMermaidAsPng: vi.fn(() => Promise.resolve()),
  openMermaidFullscreen: vi.fn(() => Promise.resolve()),
}));

if (typeof localStorage === 'undefined' || localStorage === null) {
  const store = new Map();
  const memoryStorage = {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key) { return store.has(String(key)) ? store.get(String(key)) : null; },
    key(index) { return [...store.keys()][index] ?? null; },
    removeItem(key) { store.delete(String(key)); },
    setItem(key, value) { store.set(String(key), String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* iterator() {},
  });
}