import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';

const inlinePatterns = [
  { regexp: /\*\*([^*\n]+)\*\*/g, className: 'cm-live-strong', markers: [[0, 2], [-2, 0]] },
  { regexp: /(?<!\*)\*([^*\n]+)\*(?!\*)/g, className: 'cm-live-emphasis', markers: [[0, 1], [-1, 0]] },
  { regexp: /~~([^~\n]+)~~/g, className: 'cm-live-strike', markers: [[0, 2], [-2, 0]] },
  { regexp: /==([^=\n]+)==/g, className: 'cm-live-highlight', markers: [[0, 2], [-2, 0]] },
  { regexp: /`([^`\n]+)`/g, className: 'cm-live-inline-code', markers: [[0, 1], [-1, 0]] },
  { regexp: /\[([^\]\n]+)\]\(([^)\n]+)\)/g, className: 'cm-live-link', markers: [[0, 1], ['](', 2], [-1, 0]] },
  { regexp: /\[\[([^\]\n]+)\]\]/g, className: 'cm-live-wikilink', markers: [[0, 2], [-2, 0]] }
];

const livePreviewPlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = buildDecorations(view);
  }

  update(update) {
    if (update.docChanged || update.viewportChanged) {
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
  for (const { from, to } of view.visibleRanges) {
    addVisibleRangeDecorations(view, ranges, from, to);
  }
  return Decoration.set(ranges, true);
}

function addVisibleRangeDecorations(view, ranges, from, to) {
  let inFence = isInsideFence(view.state.doc, from);

  for (let pos = from; pos <= to;) {
    const line = view.state.doc.lineAt(pos);
    const { skipInline, nextInFence } = addLineDecorations(ranges, line, inFence);
    if (!skipInline) {
      addInlineDecorations(ranges, line);
    }
    inFence = nextInFence;

    if (line.to >= to) break;
    pos = line.to + 1;
  }
}

function addLineDecorations(ranges, line, inFence) {
  const text = line.text;
  const fence = text.match(/^(\s*)(```|~~~)/);
  if (fence) {
    addLineClass(ranges, line, 'cm-live-codeblock-line cm-live-code-fence-line');
    addMarker(ranges, line.from + fence[1].length, line.from + fence[1].length + fence[2].length);
    return { skipInline: true, nextInFence: !inFence };
  }

  if (inFence) {
    addLineClass(ranges, line, 'cm-live-codeblock-line');
    return { skipInline: true, nextInFence: inFence };
  }

  const heading = text.match(/^(#{1,6})\s+/);
  if (heading) {
    addLineClass(ranges, line, `cm-live-heading-line cm-live-heading-${heading[1].length}`);
    addMarker(ranges, line.from, line.from + heading[1].length);
  }

  const quote = text.match(/^(\s*>+\s?)/);
  if (quote) {
    addLineClass(ranges, line, 'cm-live-quote-line');
    addMarker(ranges, line.from, line.from + quote[1].length);
  }

  const task = text.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)/);
  if (task) {
    addLineClass(ranges, line, 'cm-live-list-line cm-live-task-line');
    addMarker(ranges, line.from, line.from + task[1].length);
    return { skipInline: false, nextInFence: inFence };
  }

  const list = text.match(/^(\s*(?:[-*+]\s+|\d+\.\s+))/);
  if (list) {
    addLineClass(ranges, line, 'cm-live-list-line');
    addMarker(ranges, line.from, line.from + list[1].length);
  }

  return { skipInline: false, nextInFence: inFence };
}

function addInlineDecorations(ranges, line) {
  for (const pattern of inlinePatterns) {
    pattern.regexp.lastIndex = 0;
    let match = pattern.regexp.exec(line.text);
    while (match) {
      const from = line.from + match.index;
      const to = from + match[0].length;
      ranges.push(Decoration.mark({ class: pattern.className }).range(from, to));
      for (const [start, end] of markerRanges(match, pattern.markers)) {
        addMarker(ranges, from + start, from + end);
      }
      match = pattern.regexp.exec(line.text);
    }
  }
}

function markerRanges(match, markers) {
  const length = match[0].length;
  return markers.map(([start, end]) => {
    const resolvedStart = resolveStartOffset(match, length, start);
    const resolvedEnd = typeof end === 'number' && end > 0 && typeof start === 'string'
      ? resolvedStart + end
      : resolveEndOffset(match, length, end);
    return [resolvedStart, resolvedEnd];
  }).filter(([start, end]) => end > start);
}

function resolveStartOffset(match, length, offset) {
  if (typeof offset === 'string') {
    const index = match[0].indexOf(offset);
    return index < 0 ? length : index;
  }
  if (offset < 0) return length + offset;
  return offset;
}

function resolveEndOffset(match, length, offset) {
  if (typeof offset === 'string') {
    const index = match[0].indexOf(offset);
    return index < 0 ? length : index;
  }
  if (offset <= 0) return length + offset;
  return offset;
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

function addLineClass(ranges, line, className) {
  ranges.push(Decoration.line({ class: className }).range(line.from));
}

function addMarker(ranges, from, to) {
  if (to > from) {
    ranges.push(Decoration.mark({ class: 'cm-live-marker' }).range(from, to));
  }
}
