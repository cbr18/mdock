import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';

const hidden = Decoration.replace({ inclusive: false });

const inlinePatterns = [
  { regexp: /\*\*([^*\n]+)\*\*/g, className: 'cm-live-strong', markers: (match) => [[0, 2], [match[0].length - 2, match[0].length]] },
  { regexp: /(?<!\*)\*([^*\n]+)\*(?!\*)/g, className: 'cm-live-emphasis', markers: (match) => [[0, 1], [match[0].length - 1, match[0].length]] },
  { regexp: /~~([^~\n]+)~~/g, className: 'cm-live-strike', markers: (match) => [[0, 2], [match[0].length - 2, match[0].length]] },
  { regexp: /==([^=\n]+)==/g, className: 'cm-live-highlight', markers: (match) => [[0, 2], [match[0].length - 2, match[0].length]] },
  { regexp: /`([^`\n]+)`/g, className: 'cm-live-inline-code', markers: (match) => [[0, 1], [match[0].length - 1, match[0].length]] }
];

const livePreviewPlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = buildDecorations(view);
  }

  update(update) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = buildDecorations(update.view);
    }
  }
}, {
  decorations: (plugin) => plugin.decorations
});

export function livePreviewExtension() {
  return [
    livePreviewPlugin,
    EditorView.theme({
      '&.cm-live-preview': {}
    })
  ];
}

function buildDecorations(view) {
  const ranges = [];
  const activeLines = getActiveLines(view);
  const frontmatterLines = getFrontmatterLines(view.state.doc);

  for (const { from, to } of view.visibleRanges) {
    addVisibleRangeDecorations(view, ranges, from, to, activeLines, frontmatterLines);
  }

  return Decoration.set(ranges, true);
}

function addVisibleRangeDecorations(view, ranges, from, to, activeLines, frontmatterLines) {
  let inFence = isInsideFence(view.state.doc, from);

  for (let pos = from; pos <= to;) {
    const line = view.state.doc.lineAt(pos);
    const active = activeLines.has(line.number);
    const frontmatter = frontmatterLines.has(line.number);
    const { skipInline, nextInFence } = addLineDecorations(ranges, line, { active, inFence, frontmatter });

    if (!skipInline) {
      addInlineDecorations(ranges, line, active);
    }

    inFence = nextInFence;
    if (line.to >= to) break;
    pos = line.to + 1;
  }
}

function addLineDecorations(ranges, line, context) {
  const { active, inFence, frontmatter } = context;
  const text = line.text;

  if (frontmatter) {
    addLineClass(ranges, line, `cm-live-frontmatter-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active && text.trim() === '---') {
      addHidden(ranges, line.from, line.to);
    }
    return { skipInline: true, nextInFence: inFence };
  }

  const fence = text.match(/^(\s*)(```|~~~)(.*)$/);
  if (fence) {
    addLineClass(ranges, line, `cm-live-codeblock-line cm-live-code-fence-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addHidden(ranges, line.from + fence[1].length, line.from + fence[1].length + fence[2].length);
      if (fence[3]) {
        addMark(ranges, line.from + fence[1].length + fence[2].length, line.to, 'cm-live-code-language');
      }
    }
    return { skipInline: true, nextInFence: !inFence };
  }

  if (inFence) {
    addLineClass(ranges, line, `cm-live-codeblock-line${active ? ' cm-live-active-source-line' : ''}`);
    return { skipInline: true, nextInFence: inFence };
  }

  const horizontalRule = text.match(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/);
  if (horizontalRule) {
    addLineClass(ranges, line, `cm-live-horizontal-rule-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addReplaceWidget(ranges, line.from, line.to, new HorizontalRuleWidget());
    }
    return { skipInline: true, nextInFence: inFence };
  }

  const heading = text.match(/^(#{1,6})\s+/);
  if (heading) {
    addLineClass(ranges, line, `cm-live-heading-line cm-live-heading-${heading[1].length}${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addHidden(ranges, line.from, line.from + heading[0].length);
    }
  }

  const quote = text.match(/^(\s*>+\s?)/);
  if (quote) {
    addLineClass(ranges, line, `cm-live-quote-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addHidden(ranges, line.from, line.from + quote[1].length);
    }
  }

  const task = text.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+/);
  if (task) {
    const markerTo = line.from + task[0].length;
    addLineClass(ranges, line, `cm-live-list-line cm-live-task-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addReplaceWidget(ranges, line.from + task[1].length, markerTo, new CheckboxWidget(task[3].toLowerCase() === 'x'));
    }
    return { skipInline: false, nextInFence: inFence };
  }

  const bullet = text.match(/^(\s*)([-*+])\s+/);
  if (bullet) {
    addLineClass(ranges, line, `cm-live-list-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addReplaceWidget(ranges, line.from + bullet[1].length, line.from + bullet[0].length, new BulletWidget());
    }
    return { skipInline: false, nextInFence: inFence };
  }

  const ordered = text.match(/^(\s*)(\d+\.)\s+/);
  if (ordered) {
    addLineClass(ranges, line, `cm-live-list-line${active ? ' cm-live-active-source-line' : ''}`);
    if (!active) {
      addMark(ranges, line.from + ordered[1].length, line.from + ordered[1].length + ordered[2].length, 'cm-live-list-number');
      addHidden(ranges, line.from + ordered[0].length - 1, line.from + ordered[0].length);
    }
  }

  if (isTableLine(text)) {
    addLineClass(ranges, line, `cm-live-table-line${active ? ' cm-live-active-source-line' : ''}`);
  }

  return { skipInline: false, nextInFence: inFence };
}

function addInlineDecorations(ranges, line, active) {
  for (const pattern of inlinePatterns) {
    pattern.regexp.lastIndex = 0;
    let match = pattern.regexp.exec(line.text);
    while (match) {
      const from = line.from + match.index;
      const to = from + match[0].length;
      addMark(ranges, from, to, pattern.className);
      if (!active) {
        for (const [start, end] of pattern.markers(match)) {
          addHidden(ranges, from + start, from + end);
        }
      }
      match = pattern.regexp.exec(line.text);
    }
  }

  addMarkdownLinks(ranges, line, active);
  addWikilinks(ranges, line, active);
}

function addMarkdownLinks(ranges, line, active) {
  const regexp = /(!?)\[([^\]\n]+)\]\(([^)\n]+)\)/g;
  let match = regexp.exec(line.text);
  while (match) {
    const from = line.from + match.index;
    const to = from + match[0].length;
    const labelFrom = from + match[1].length + 1;
    const labelTo = labelFrom + match[2].length;
    addMark(ranges, labelFrom, labelTo, match[1] ? 'cm-live-image-label' : 'cm-live-link');
    if (!active) {
      addHidden(ranges, from, labelFrom);
      addHidden(ranges, labelTo, to);
    }
    match = regexp.exec(line.text);
  }
}

function addWikilinks(ranges, line, active) {
  const regexp = /(!?)\[\[([^\]\n]+)\]\]/g;
  let match = regexp.exec(line.text);
  while (match) {
    const from = line.from + match.index;
    const to = from + match[0].length;
    const body = match[2];
    const bodyFrom = from + match[1].length + 2;
    const aliasIndex = body.indexOf('|');
    const visibleFrom = aliasIndex >= 0 ? bodyFrom + aliasIndex + 1 : bodyFrom;
    const visibleTo = bodyFrom + body.length;
    addMark(ranges, visibleFrom, visibleTo, match[1] ? 'cm-live-embed-label' : 'cm-live-wikilink');
    if (!active) {
      addHidden(ranges, from, visibleFrom);
      addHidden(ranges, visibleTo, to);
    }
    match = regexp.exec(line.text);
  }
}

function getActiveLines(view) {
  const lines = new Set();
  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from);
    const toLine = view.state.doc.lineAt(range.to);
    for (let line = fromLine.number; line <= toLine.number; line += 1) {
      lines.add(line);
    }
  }
  return lines;
}

function getFrontmatterLines(doc) {
  const lines = new Set();
  if (doc.lines < 3) return lines;

  const first = doc.line(1);
  if (first.text.trim() !== '---') return lines;

  for (let number = 1; number <= doc.lines; number += 1) {
    const line = doc.line(number);
    lines.add(number);
    if (number > 1 && line.text.trim() === '---') {
      break;
    }
    if (number > 80) {
      lines.clear();
      break;
    }
  }
  return lines;
}

function isInsideFence(doc, from) {
  let inFence = false;
  let pos = 0;
  while (pos < from) {
    const line = doc.lineAt(pos);
    if (/^\s*(```|~~~)/.test(line.text)) {
      inFence = !inFence;
    }
    if (line.to >= from) break;
    pos = line.to + 1;
  }
  return inFence;
}

function isTableLine(text) {
  return /^\s*\|.*\|\s*$/.test(text) || /^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(text);
}

function addLineClass(ranges, line, className) {
  ranges.push(Decoration.line({ class: className }).range(line.from));
}

function addMark(ranges, from, to, className) {
  if (to > from) {
    ranges.push(Decoration.mark({ class: className }).range(from, to));
  }
}

function addHidden(ranges, from, to) {
  if (to > from) {
    ranges.push(hidden.range(from, to));
  }
}

function addReplaceWidget(ranges, from, to, widget) {
  if (to > from) {
    ranges.push(Decoration.replace({ widget, inclusive: false }).range(from, to));
  }
}

class CheckboxWidget extends WidgetType {
  constructor(checked) {
    super();
    this.checked = checked;
  }

  eq(other) {
    return other.checked === this.checked;
  }

  toDOM() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.disabled = true;
    checkbox.className = 'cm-live-task-checkbox';
    checkbox.setAttribute('aria-hidden', 'true');
    return checkbox;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const bullet = document.createElement('span');
    bullet.className = 'cm-live-bullet';
    bullet.setAttribute('aria-hidden', 'true');
    bullet.textContent = '•';
    return bullet;
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const rule = document.createElement('span');
    rule.className = 'cm-live-horizontal-rule';
    rule.setAttribute('aria-hidden', 'true');
    return rule;
  }
}
