import { EditorSelection } from '@codemirror/state';
import {
  ensureFrontmatter,
  indentLines,
  insertBlockMath,
  insertCallout,
  insertCodeBlock,
  insertEmbed,
  insertFootnote,
  insertHorizontalRule,
  insertImage,
  insertInlineMath,
  insertMarkdownLink,
  insertTable,
  insertWikilink,
  outdentLines,
  setHeading,
  setParagraph,
  toggleBlockquote,
  toggleBulletList,
  toggleComment,
  toggleInlineCode,
  toggleInlineMark,
  toggleOrderedList,
  toggleTaskDone,
  toggleTaskList
} from './markdownActions.js';

export const CALLOUT_TYPES = ['note', 'info', 'tip', 'warning', 'danger', 'success', 'question'];
export const CODE_LANGUAGES = ['', 'js', 'ts', 'md', 'json', 'yaml', 'css', 'html'];

function staticParam(name, value) {
  return { name, type: 'static', value };
}

function textParam(name, options = {}) {
  return { name, type: 'text', ...options };
}

function numberParam(name, options = {}) {
  return { name, type: 'number', ...options };
}

function selectParam(name, options) {
  return { name, type: 'select', ...options };
}

export const COMMANDS = {
  paragraph: { params: [], run: (state) => setParagraph(state) },
  heading1: { params: [staticParam('level', 1)], run: (state, values) => setHeading(state, values.level) },
  heading2: { params: [staticParam('level', 2)], run: (state, values) => setHeading(state, values.level) },
  heading3: { params: [staticParam('level', 3)], run: (state, values) => setHeading(state, values.level) },
  heading4: { params: [staticParam('level', 4)], run: (state, values) => setHeading(state, values.level) },
  heading5: { params: [staticParam('level', 5)], run: (state, values) => setHeading(state, values.level) },
  heading6: { params: [staticParam('level', 6)], run: (state, values) => setHeading(state, values.level) },
  quote: { params: [], run: (state) => toggleBlockquote(state) },
  codeBlock: { params: [selectParam('lang', { options: CODE_LANGUAGES, default: '' })], run: (state, values) => insertCodeBlock(state, values.lang) },
  bold: { params: [], run: (state) => toggleInlineMark(state, '**') },
  italic: { params: [], run: (state) => toggleInlineMark(state, '*') },
  strikethrough: { params: [], run: (state) => toggleInlineMark(state, '~~') },
  highlight: { params: [], run: (state) => toggleInlineMark(state, '==') },
  inlineCode: { params: [], run: (state) => toggleInlineCode(state) },
  comment: { params: [], run: (state) => toggleInlineMark(state, '%%') },
  bulletList: { params: [], run: (state) => toggleBulletList(state) },
  orderedList: { params: [], run: (state) => toggleOrderedList(state) },
  taskList: { params: [], run: (state) => toggleTaskList(state) },
  taskDone: { params: [], run: (state) => toggleTaskDone(state) },
  indent: { params: [], run: (state) => indentLines(state) },
  outdent: { params: [], run: (state) => outdentLines(state) },
  link: {
    params: [textParam('url', { default: '', placeholderParam: 'placeholderUrl' }), textParam('label')],
    run: (state, values) => insertMarkdownLink(state, values.url, values.label)
  },
  image: {
    params: [textParam('url'), textParam('alt')],
    run: (state, values) => insertImage(state, values.url, values.alt)
  },
  wikilink: {
    params: [textParam('target'), textParam('alias')],
    run: (state, values) => insertWikilink(state, values.target, values.alias)
  },
  embed: {
    params: [textParam('target')],
    run: (state, values) => insertEmbed(state, values.target)
  },
  table: {
    params: [numberParam('rows', { default: 2 }), numberParam('cols', { default: 2 })],
    run: (state, values) => insertTable(state, values.rows, values.cols)
  },
  callout: {
    params: [selectParam('type', { options: CALLOUT_TYPES, default: 'note' }), textParam('title')],
    run: (state, values) => insertCallout(state, values.type, values.title)
  },
  horizontalRule: { params: [], run: (state) => insertHorizontalRule(state) },
  inlineMath: { params: [], run: (state) => insertInlineMath(state) },
  blockMath: { params: [], run: (state) => insertBlockMath(state) },
  footnote: {
    params: [textParam('id', { default: 'note' }), textParam('text')],
    run: (state, values) => insertFootnote(state, values.id, values.text)
  },
  metadata: {
    params: [textParam('key', { default: 'title' }), textParam('value')],
    run: (state, values) => {
      const entries = {};
      if (values.key) entries[String(values.key).trim()] = values.value;
      return ensureFrontmatter(state, entries);
    }
  }
};

export function applyCommandToView(view, key, passedValues = {}) {
  const command = COMMANDS[key];
  if (!command) return false;
  const text = view.state.doc.toString();
  const main = view.state.selection.main;
  const from = Math.min(main.from, main.to);
  const to = Math.max(main.from, main.to);
  const values = { ...initialFormValues(command), ...passedValues };
  const result = command.run({ text, selectionStart: from, selectionEnd: to }, values);
  if (!result || result.text === text) return false;
  view.dispatch({
    changes: { from: 0, to: text.length, insert: result.text },
    selection: EditorSelection.single(result.selectionStart, result.selectionEnd),
    userEvent: 'input'
  });
  view.focus();
  return true;
}

export function initialFormValues(command) {
  const values = {};
  if (!command) return values;
  for (const param of command.params || []) {
    values[param.name] = param.value ?? param.default ?? '';
  }
  return values;
}