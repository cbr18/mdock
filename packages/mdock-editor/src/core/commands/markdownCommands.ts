/**
 * Markdown editing commands for CodeMirror 6
 * Adapted from markdownActions.js to work with EditorView/EditorState
 */

import { EditorView } from '@codemirror/view';
import { EditorState, Text } from '@codemirror/state';

const LINE_MARKERS = {
  bullet: '- ',
  task: '- [ ] ',
  ordered: '1. ',
  quote: '> ',
} as const;

/**
 * Apply a command to an EditorView
 */
export function applyCommandToView(
  view: EditorView,
  commandId: string,
  values: Record<string, any> = {}
): boolean {
  const { state } = view;
  let changes: { from: number; to: number; insert: string } | null = null;
  let selectionStart = state.selection.main.from;
  let selectionEnd = state.selection.main.to;

  const dispatch = (spec: { changes: { from: number; to: number; insert: string }; selection?: { anchor: number; head: number } }) => {
    changes = spec.changes;
    if (spec.selection) {
      selectionStart = spec.selection.anchor;
      selectionEnd = spec.selection.head;
    }
  };

  // Create a mock state object compatible with markdownActions
  const mockState = createMockState(state);

  // Execute the command
  let result: ReturnType<typeof executeCommand> | null = null;
  try {
    result = executeCommand(commandId, mockState, values, dispatch);
  } catch (e) {
    console.error(`Command ${commandId} failed:`, e);
    return false;
  }

  if (changes) {
    view.dispatch({
      changes: { from: changes.from, to: changes.to, insert: changes.insert },
      selection: { anchor: selectionStart, head: selectionEnd },
      scrollIntoView: true,
      userEvent: 'input',
    });
    return true;
  }
  return false;
}

function createMockState(state: EditorState) {
  const text = state.doc.toString();
  const selection = state.selection.main;
  return {
    text,
    selectionStart: selection.from,
    selectionEnd: selection.to,
    doc: state.doc,
  };
}

function executeCommand(
  commandId: string,
  state: any,
  values: Record<string, any>,
  dispatch: (spec: any) => void
): any {
  switch (commandId) {
    case 'paragraph':
      dispatch(setParagraph(state));
      break;
    case 'heading1':
      dispatch(setHeading(state, 1));
      break;
    case 'heading2':
      dispatch(setHeading(state, 2));
      break;
    case 'heading3':
      dispatch(setHeading(state, 3));
      break;
    case 'heading4':
      dispatch(setHeading(state, 4));
      break;
    case 'heading5':
      dispatch(setHeading(state, 5));
      break;
    case 'heading6':
      dispatch(setHeading(state, 6));
      break;
    case 'quote':
      dispatch(toggleBlockquote(state));
      break;
    case 'bold':
      dispatch(toggleInlineMark(state, '**'));
      break;
    case 'italic':
      dispatch(toggleInlineMark(state, '*'));
      break;
    case 'strikethrough':
      dispatch(toggleInlineMark(state, '~~'));
      break;
    case 'highlight':
      dispatch(toggleInlineMark(state, '=='));
      break;
    case 'inlineCode':
      dispatch(toggleInlineCode(state));
      break;
    case 'comment':
      dispatch(toggleComment(state));
      break;
    case 'bulletList':
      dispatch(toggleBulletList(state));
      break;
    case 'orderedList':
      dispatch(toggleOrderedList(state));
      break;
    case 'taskList':
      dispatch(toggleTaskList(state));
      break;
    case 'taskDone':
      dispatch(toggleTaskDone(state));
      break;
    case 'indent':
      dispatch(indentLines(state));
      break;
    case 'outdent':
      dispatch(outdentLines(state));
      break;
    case 'codeBlock':
      dispatch(insertCodeBlock(state, values.lang || ''));
      break;
    case 'horizontalRule':
      dispatch(insertHorizontalRule(state));
      break;
    case 'table':
      dispatch(insertTable(state, values.rows || 2, values.cols || 2));
      break;
    case 'link':
      dispatch(insertMarkdownLink(state, values.url || '', values.label || ''));
      break;
    case 'image':
      dispatch(insertImage(state, values.url || '', values.alt || ''));
      break;
    case 'wikilink':
      dispatch(insertWikilink(state, values.target || '', values.alias || ''));
      break;
    case 'embed':
      dispatch(insertEmbed(state, values.target || ''));
      break;
    case 'callout':
      dispatch(insertCallout(state, values.type || 'note', values.title || ''));
      break;
    case 'inlineMath':
      dispatch(insertInlineMath(state));
      break;
    case 'blockMath':
      dispatch(insertBlockMath(state));
      break;
    case 'footnote':
      dispatch(insertFootnote(state, values.id || '1', values.text || ''));
      break;
    case 'metadata':
      dispatch(ensureFrontmatter(state, values));
      break;
    default:
      return null;
  }
  return true;
}

// --- Core transformation functions (adapted from markdownActions.js) ---

function toggleInlineMark(state: any, marker: string) {
  const selection = selectedText(state);
  const before = state.text.slice(selection.start - marker.length, selection.start);
  const after = state.text.slice(selection.end, selection.end + marker.length);

  if (before === marker && after === marker) {
    return replaceRange(
      state,
      selection.start - marker.length,
      selection.end + marker.length,
      state.text.slice(selection.start, selection.end),
      selection.start - marker.length,
      selection.end - marker.length
    );
  }
  if (selection.value.startsWith(marker) && selection.value.endsWith(marker) && selection.value.length >= marker.length * 2) {
    const unwrapped = selection.value.slice(marker.length, selection.value.length - marker.length);
    return replaceRange(state, selection.start, selection.end, unwrapped, selection.start, selection.start + unwrapped.length);
  }
  if (selection.value.length > 0 && (selection.value.includes('\n') || coversStructuralPrefix(state, selection))) {
    return applyInlineOverLines(state, marker);
  }
  return replaceSelection(state, `${marker}${selection.value}${marker}`, selection.start + marker.length, selection.end + marker.length);
}

function toggleInlineCode(state: any) {
  const selection = selectedText(state);
  const marker = selection.value.includes('`') ? '``' : '`';
  return toggleInlineMark(state, marker);
}

function setHeading(state: any, level: number) {
  if (level < 1 || level > 6) {
    return setParagraph(state);
  }
  return mapSelectedLines(state, (line: string) => {
    const content = line.replace(/^#{1,6}\s+/, '').replace(/^>\s+/, '');
    return `${'#'.repeat(level)} ${content}`;
  });
}

function setParagraph(state: any) {
  return mapSelectedLines(state, (line: string) => stripBlockPrefix(line));
}

function toggleBlockquote(state: any) {
  return toggleLinePrefix(state, LINE_MARKERS.quote, /^>\s?/);
}

function toggleBulletList(state: any) {
  return toggleLinePrefix(state, LINE_MARKERS.bullet, /^(\s*)([-*+]\s+|\d+[.)]\s+|- \[[^\]]\]\s+)/, '$1');
}

function toggleOrderedList(state: any) {
  const block = selectedLineBlock(state);
  const lines = block.value.split('\n');
  const allOrdered = lines.every((line) => line.trim() === '' || /^\s*\d+[.)]\s+/.test(line));
  const next = lines.map((line: string, index: number) => {
    if (line.trim() === '') return line;
    if (allOrdered) return line.replace(/^(\s*)\d+[.)]\s+/, '$1');
    const indent = line.match(/^\s*/)?.[0] || '';
    return `${indent}${index + 1}. ${stripListPrefix(line).trimStart()}`;
  }).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function toggleTaskList(state: any) {
  return toggleLinePrefix(state, LINE_MARKERS.task, /^(\s*)- \[[^\]]\]\s+/, '$1');
}

function toggleTaskDone(state: any) {
  return mapSelectedLines(state, (line: string) => {
    if (/^(\s*)- \[[xX]\]\s+/.test(line)) return line.replace(/^(\s*)- \[[xX]\]\s+/, '$1- [ ] ');
    if (/^(\s*)- \[[^\]]\]\s+/.test(line)) return line.replace(/^(\s*)- \[[^\]]\]\s+/, '$1- [x] ');
    return line;
  });
}

function indentLines(state: any) {
  return mapSelectedLines(state, (line: string) => line ? `  ${line}` : line);
}

function outdentLines(state: any) {
  return mapSelectedLines(state, (line: string) => line.replace(/^( {1,2}|\t)/, ''));
}

function insertCodeBlock(state: any, language = '') {
  const selection = selectedText(state);
  const body = selection.value || '';
  const block = `\`\`\`${language}\n${body}\n\`\`\``;
  return replaceSelection(state, block, selection.start + 4 + language.length, selection.start + 4 + language.length + body.length);
}

function insertHorizontalRule(state: any) {
  return insertBlock(state, '---');
}

function insertTable(state: any, rows = 2, columns = 2) {
  const header = Array.from({ length: columns }, () => '').join(' | ');
  const separator = Array.from({ length: columns }, () => '---').join(' | ');
  const body = Array.from({ length: rows }, () => Array.from({ length: columns }, () => '').join(' | '));
  return insertBlock(state, [`| ${header} |`, `| ${separator} |`, ...body.map((row) => `| ${row} |`)].join('\n'));
}

function insertMarkdownLink(state: any, url = '', label = '') {
  const selection = selectedText(state);
  const text = label || selection.value || 'link';
  const value = `[${text}](${url})`;
  return replaceSelection(state, value, selection.start + 1, selection.start + 1 + text.length);
}

function insertImage(state: any, url = '', alt = '') {
  const selection = selectedText(state);
  const text = alt || selection.value || 'image';
  const value = `![${text}](${url})`;
  return replaceSelection(state, value, selection.start + 2, selection.start + 2 + text.length);
}

function insertWikilink(state: any, target = '', alias = '') {
  const selection = selectedText(state);
  const linkTarget = target || selection.value || 'Page';
  const value = alias ? `[[${linkTarget}|${alias}]]` : `[[${linkTarget}]]`;
  return replaceSelection(state, value, selection.start + 2, selection.start + 2 + linkTarget.length);
}

function insertEmbed(state: any, target = '') {
  const selection = selectedText(state);
  const value = `![[${target || selection.value || 'File'}]]`;
  return replaceSelection(state, value, selection.start + 3, selection.start + value.length - 2);
}

function insertCallout(state: any, type = 'note', title = '') {
  const selection = selectedText(state);
  const body = selection.value || '';
  const firstLine = `> [!${type}]${title ? ` ${title}` : ''}`;
  const quotedBody = body ? body.split('\n').map((line) => `> ${line}`).join('\n') : '> ';
  return replaceSelection(state, `${firstLine}\n${quotedBody}`, selection.start, selection.start + firstLine.length);
}

function insertInlineMath(state: any) {
  return toggleInlineMark(state, '$');
}

function insertBlockMath(state: any) {
  const selection = selectedText(state);
  const body = selection.value || '';
  return replaceSelection(state, `$$\n${body}\n$$`, selection.start + 3, selection.start + 3 + body.length);
}

function insertFootnote(state: any, id = '1', text = '') {
  const selection = selectedText(state);
  const reference = `[^${id}]`;
  const definition = `\n\n[^${id}]: ${text}`;
  return replaceSelection(state, `${selection.value}${reference}${definition}`, selection.end + reference.length + 2, selection.end + reference.length + 2 + text.length);
}

function toggleComment(state: any) {
  return toggleInlineMark(state, '%%');
}

function ensureFrontmatter(state: any, entries: Record<string, any> = {}) {
  const yaml = Object.entries(entries)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join('\n');
  const block = `---\n${yaml}\n---\n`;
  const existing = state.text.match(/^---\n[\s\S]*?\n---\n?/);
  if (existing) {
    return replaceRange(state, 0, existing[0].length, block, state.selectionStart, state.selectionEnd);
  }
  return replaceRange(state, 0, 0, block, state.selectionStart + block.length, state.selectionEnd + block.length);
}

// --- Helper functions ---

function selectedText(state: any) {
  const start = Math.min(state.selectionStart, state.selectionEnd);
  const end = Math.max(state.selectionStart, state.selectionEnd);
  return { start, end, value: state.text.slice(start, end) };
}

function selectedLineBlock(state: any) {
  const selection = selectedText(state);
  const start = state.text.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  let end = state.text.indexOf('\n', selection.end);
  if (end === -1) end = state.text.length;
  return { start, end, value: state.text.slice(start, end) };
}

function replaceSelection(state: any, value: string, selectionStart: number, selectionEnd: number) {
  const selection = selectedText(state);
  return replaceRange(state, selection.start, selection.end, value, selectionStart, selectionEnd);
}

function applyInlineOverLines(state: any, marker: string) {
  const block = selectedLineBlock(state);
  const next = block.value.split('\n').map((line: string) => {
    if (line.trim() === '') return line;
    const prefix = structuralPrefix(line);
    const content = line.slice(prefix.length);
    if (content.startsWith(marker) && content.endsWith(marker) && content.length >= marker.length * 2) {
      return prefix + content.slice(marker.length, content.length - marker.length);
    }
    return prefix + marker + content + marker;
  }).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function coversStructuralPrefix(state: any, selection: any) {
  if (selection.value.includes('\n')) return true;
  const lineStart = state.text.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  let lineEnd = state.text.indexOf('\n', selection.end);
  if (lineEnd === -1) lineEnd = state.text.length;
  const prefixLength = structuralPrefix(state.text.slice(lineStart, lineEnd)).length;
  return prefixLength > 0 && selection.start - lineStart <= prefixLength;
}

function structuralPrefix(line: string) {
  const match = line.match(/^(#{1,6}[ \t]+|>\s?|-\s+\[[ xX]?\]\s+|[-*+][ \t]+|\d{1,9}[.)][ \t]+)/);
  return match ? match[0] : '';
}

function replaceRange(state: any, start: number, end: number, value: string, selectionStart: number, selectionEnd: number) {
  return {
    text: `${state.text.slice(0, start)}${value}${state.text.slice(end)}`,
    selectionStart,
    selectionEnd,
  };
}

function mapSelectedLines(state: any, mapper: (line: string) => string) {
  const block = selectedLineBlock(state);
  const next = block.value.split('\n').map(mapper).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function toggleLinePrefix(state: any, prefix: string, pattern: RegExp, replacement = '') {
  const block = selectedLineBlock(state);
  const lines = block.value.split('\n');
  const allPrefixed = lines.every((line) => line.trim() === '' || pattern.test(line));
  const next = lines.map((line: string) => {
    if (line.trim() === '') return line;
    if (allPrefixed) return line.replace(pattern, replacement);
    return `${line.match(/^\s*/)?.[0] || ''}${prefix}${stripListPrefix(line).trimStart()}`;
  }).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function insertBlock(state: any, block: string) {
  const selection = selectedText(state);
  const before = selection.start > 0 && state.text[selection.start - 1] !== '\n' ? '\n\n' : '';
  const after = selection.end < state.text.length && state.text[selection.end] !== '\n' ? '\n\n' : '';
  const value = `${before}${block}${after}`;
  return replaceSelection(state, value, selection.start + before.length, selection.start + before.length + block.length);
}

function stripBlockPrefix(line: string) {
  return stripListPrefix(line)
    .replace(/^>\s?/, '')
    .replace(/^#{1,6}\s+/, '');
}

function stripListPrefix(line: string) {
  return line.replace(/^(\s*)([-*+]\s+|\d+[.)]\s+|- \[[^\]]\]\s+)/, '$1');
}

function formatYamlValue(value: any) {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(', ')}]`;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

// Export all functions for testing
export {
  toggleInlineMark,
  toggleInlineCode,
  setHeading,
  setParagraph,
  toggleBlockquote,
  toggleBulletList,
  toggleOrderedList,
  toggleTaskList,
  toggleTaskDone,
  indentLines,
  outdentLines,
  insertCodeBlock,
  insertHorizontalRule,
  insertTable,
  insertMarkdownLink,
  insertImage,
  insertWikilink,
  insertEmbed,
  insertCallout,
  insertInlineMath,
  insertBlockMath,
  insertFootnote,
  toggleComment,
  ensureFrontmatter,
  selectedText,
  selectedLineBlock,
  replaceSelection,
  applyInlineOverLines,
  coversStructuralPrefix,
  structuralPrefix,
  replaceRange,
  mapSelectedLines,
  toggleLinePrefix,
  insertBlock,
  stripBlockPrefix,
  stripListPrefix,
  formatYamlValue,
};