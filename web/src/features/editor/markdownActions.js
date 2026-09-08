const LINE_MARKERS = {
  bullet: '- ',
  task: '- [ ] ',
  ordered: '1. ',
  quote: '> '
};

export function toggleInlineMark(state, marker) {
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

export function toggleInlineCode(state) {
  const selection = selectedText(state);
  const marker = selection.value.includes('`') ? '``' : '`';
  return toggleInlineMark(state, marker);
}

export function setHeading(state, level) {
  if (level < 1 || level > 6) {
    return setParagraph(state);
  }
  return mapSelectedLines(state, (line) => {
    const content = line.replace(/^#{1,6}\s+/, '').replace(/^>\s+/, '');
    return `${'#'.repeat(level)} ${content}`;
  });
}

export function setParagraph(state) {
  return mapSelectedLines(state, (line) => stripBlockPrefix(line));
}

export function toggleBlockquote(state) {
  return toggleLinePrefix(state, LINE_MARKERS.quote, /^>\s?/);
}

export function toggleBulletList(state) {
  return toggleLinePrefix(state, LINE_MARKERS.bullet, /^(\s*)([-*+]\s+|\d+[.)]\s+|- \[[^\]]\]\s+)/, '$1');
}

export function toggleOrderedList(state) {
  const block = selectedLineBlock(state);
  const lines = block.value.split('\n');
  const allOrdered = lines.every((line) => line.trim() === '' || /^\s*\d+[.)]\s+/.test(line));
  const next = lines.map((line, index) => {
    if (line.trim() === '') return line;
    if (allOrdered) return line.replace(/^(\s*)\d+[.)]\s+/, '$1');
    const indent = line.match(/^\s*/)?.[0] || '';
    return `${indent}${index + 1}. ${stripListPrefix(line).trimStart()}`;
  }).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

export function toggleTaskList(state) {
  return toggleLinePrefix(state, LINE_MARKERS.task, /^(\s*)- \[[^\]]\]\s+/, '$1');
}

export function toggleTaskDone(state) {
  return mapSelectedLines(state, (line) => {
    if (/^(\s*)- \[[xX]\]\s+/.test(line)) return line.replace(/^(\s*)- \[[xX]\]\s+/, '$1- [ ] ');
    if (/^(\s*)- \[[^\]]\]\s+/.test(line)) return line.replace(/^(\s*)- \[[^\]]\]\s+/, '$1- [x] ');
    return line;
  });
}

export function indentLines(state) {
  return mapSelectedLines(state, (line) => line ? `  ${line}` : line);
}

export function outdentLines(state) {
  return mapSelectedLines(state, (line) => line.replace(/^( {1,2}|\t)/, ''));
}

export function insertCodeBlock(state, language = '') {
  const selection = selectedText(state);
  const body = selection.value || '';
  const block = `\`\`\`${language}\n${body}\n\`\`\``;
  return replaceSelection(state, block, selection.start + 4 + language.length, selection.start + 4 + language.length + body.length);
}

export function insertHorizontalRule(state) {
  return insertBlock(state, '---');
}

export function insertTable(state, rows = 2, columns = 2) {
  const header = Array.from({ length: columns }, () => '').join(' | ');
  const separator = Array.from({ length: columns }, () => '---').join(' | ');
  const body = Array.from({ length: rows }, () => Array.from({ length: columns }, () => '').join(' | '));
  return insertBlock(state, [`| ${header} |`, `| ${separator} |`, ...body.map((row) => `| ${row} |`)].join('\n'));
}

export function insertMarkdownLink(state, url = '', label = '') {
  const selection = selectedText(state);
  const text = label || selection.value || 'link';
  const value = `[${text}](${url})`;
  return replaceSelection(state, value, selection.start + 1, selection.start + 1 + text.length);
}

export function insertImage(state, url = '', alt = '') {
  const selection = selectedText(state);
  const text = alt || selection.value || 'image';
  const value = `![${text}](${url})`;
  return replaceSelection(state, value, selection.start + 2, selection.start + 2 + text.length);
}

export function insertWikilink(state, target = '', alias = '') {
  const selection = selectedText(state);
  const linkTarget = target || selection.value || 'Page';
  const value = alias ? `[[${linkTarget}|${alias}]]` : `[[${linkTarget}]]`;
  return replaceSelection(state, value, selection.start + 2, selection.start + 2 + linkTarget.length);
}

export function insertEmbed(state, target = '') {
  const selection = selectedText(state);
  const value = `![[${target || selection.value || 'File'}]]`;
  return replaceSelection(state, value, selection.start + 3, selection.start + value.length - 2);
}

export function insertCallout(state, type = 'note', title = '') {
  const selection = selectedText(state);
  const body = selection.value || '';
  const firstLine = `> [!${type}]${title ? ` ${title}` : ''}`;
  const quotedBody = body ? body.split('\n').map((line) => `> ${line}`).join('\n') : '> ';
  return replaceSelection(state, `${firstLine}\n${quotedBody}`, selection.start, selection.start + firstLine.length);
}

export function insertInlineMath(state) {
  return toggleInlineMark(state, '$');
}

export function insertBlockMath(state) {
  const selection = selectedText(state);
  const body = selection.value || '';
  return replaceSelection(state, `$$\n${body}\n$$`, selection.start + 3, selection.start + 3 + body.length);
}

export function insertFootnote(state, id = '1', text = '') {
  const selection = selectedText(state);
  const reference = `[^${id}]`;
  const definition = `\n\n[^${id}]: ${text}`;
  return replaceSelection(state, `${selection.value}${reference}${definition}`, selection.end + reference.length + 2, selection.end + reference.length + 2 + text.length);
}

export function toggleComment(state) {
  return toggleInlineMark(state, '%%');
}

export function ensureFrontmatter(state, entries = {}) {
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

function selectedText(state) {
  const start = Math.min(state.selectionStart, state.selectionEnd);
  const end = Math.max(state.selectionStart, state.selectionEnd);
  return { start, end, value: state.text.slice(start, end) };
}

function selectedLineBlock(state) {
  const selection = selectedText(state);
  const start = state.text.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  let end = state.text.indexOf('\n', selection.end);
  if (end === -1) end = state.text.length;
  return { start, end, value: state.text.slice(start, end) };
}

function replaceSelection(state, value, selectionStart, selectionEnd) {
  const selection = selectedText(state);
  return replaceRange(state, selection.start, selection.end, value, selectionStart, selectionEnd);
}

function applyInlineOverLines(state, marker) {
  const block = selectedLineBlock(state);
  const next = block.value.split('\n').map((line) => {
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

function coversStructuralPrefix(state, selection) {
  if (selection.value.includes('\n')) return true;
  const lineStart = state.text.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  let lineEnd = state.text.indexOf('\n', selection.end);
  if (lineEnd === -1) lineEnd = state.text.length;
  const prefixLength = structuralPrefix(state.text.slice(lineStart, lineEnd)).length;
  return prefixLength > 0 && selection.start - lineStart <= prefixLength;
}

function structuralPrefix(line) {
  const match = line.match(/^(#{1,6}[ \t]+|>\s?|-\s+\[[ xX]?\]\s+|[-*+][ \t]+|\d{1,9}[.)][ \t]+)/);
  return match ? match[0] : '';
}

function replaceRange(state, start, end, value, selectionStart, selectionEnd) {
  return {
    text: `${state.text.slice(0, start)}${value}${state.text.slice(end)}`,
    selectionStart,
    selectionEnd
  };
}

function mapSelectedLines(state, mapper) {
  const block = selectedLineBlock(state);
  const next = block.value.split('\n').map(mapper).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function toggleLinePrefix(state, prefix, pattern, replacement = '') {
  const block = selectedLineBlock(state);
  const lines = block.value.split('\n');
  const allPrefixed = lines.every((line) => line.trim() === '' || pattern.test(line));
  const next = lines.map((line) => {
    if (line.trim() === '') return line;
    if (allPrefixed) return line.replace(pattern, replacement);
    return `${line.match(/^\s*/)?.[0] || ''}${prefix}${stripListPrefix(line).trimStart()}`;
  }).join('\n');
  return replaceRange(state, block.start, block.end, next, block.start, block.start + next.length);
}

function insertBlock(state, block) {
  const selection = selectedText(state);
  const before = selection.start > 0 && state.text[selection.start - 1] !== '\n' ? '\n\n' : '';
  const after = selection.end < state.text.length && state.text[selection.end] !== '\n' ? '\n\n' : '';
  const value = `${before}${block}${after}`;
  return replaceSelection(state, value, selection.start + before.length, selection.start + before.length + block.length);
}

function stripBlockPrefix(line) {
  return stripListPrefix(line)
    .replace(/^>\s?/, '')
    .replace(/^#{1,6}\s+/, '');
}

function stripListPrefix(line) {
  return line.replace(/^(\s*)([-*+]\s+|\d+[.)]\s+|- \[[^\]]\]\s+)/, '$1');
}

function formatYamlValue(value) {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(', ')}]`;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}
