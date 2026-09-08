import { Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType } from '@codemirror/view';
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { markdownRehypePlugins, markdownRemarkPlugins, splitFrontmatter } from '../files/MarkdownPreview.jsx';

export function livePreviewExtension({ frontmatterLabel = 'Frontmatter' } = {}) {
  const setActiveBlock = StateEffect.define();

  const field = StateField.define({
    create(state) {
      return buildStateValue(state, frontmatterLabel, null, setActiveBlock);
    },
    update(value, transaction) {
      let activeBlock = value.activeBlock;
      if (activeBlock && transaction.docChanged) {
        activeBlock = {
          from: transaction.changes.mapPos(activeBlock.from),
          to: transaction.changes.mapPos(activeBlock.to),
          sourceTo: transaction.changes.mapPos(activeBlock.sourceTo ?? activeBlock.to)
        };
      }

      for (const effect of transaction.effects) {
        if (effect.is(setActiveBlock)) {
          activeBlock = effect.value;
        }
      }

      if (!activeBlock && transaction.docChanged && transaction.isUserEvent('input')) {
        activeBlock = blockAtPosition(transaction.state, transaction.state.selection.main.head);
      }

      if (!transaction.docChanged && !transaction.selection && transaction.effects.length === 0) {
        return {
          activeBlock,
          decorations: value.decorations.map(transaction.changes)
        };
      }
      return buildStateValue(transaction.state, frontmatterLabel, activeBlock, setActiveBlock);
    },
    provide: (stateField) => EditorView.decorations.from(stateField, (value) => value.decorations)
  });

  return [
    field,
    Prec.highest(keymap.of([
      { key: 'ArrowUp', run: moveLogicalLine(-1) },
      { key: 'ArrowDown', run: moveLogicalLine(1) },
      { key: 'Enter', run: handleEnter },
      { key: 'Shift-Enter', run: handleSoftEnter }
    ])),
    Prec.highest(EditorView.domEventHandlers({
      mousedown(event, view) {
        return moveCursorInsideActiveLine(event, view);
      },
      keydown(event, view) {
        if ((event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || event.altKey || event.ctrlKey || event.metaKey) {
          return false;
        }
        const handled = moveLogicalLine(event.key === 'ArrowUp' ? -1 : 1)(view);
        if (handled) {
          event.preventDefault();
        }
        return handled;
      }
    })),
    EditorView.theme({
      '&.cm-live-preview': {}
    })
  ];
}

function moveLogicalLine(direction) {
  return (view) => {
    const selection = view.state.selection.main;
    if (!selection.empty) return false;

    const currentLine = view.state.doc.lineAt(selection.head);
    const nextNumber = currentLine.number + direction;
    if (nextNumber < 1 || nextNumber > view.state.doc.lines) return true;

    const nextLine = view.state.doc.line(nextNumber);
    const column = selection.head - currentLine.from;
    const nextHead = nextLine.from + Math.min(column, nextLine.length);
    view.dispatch({ selection: { anchor: nextHead }, scrollIntoView: true, userEvent: 'select' });
    return true;
  };
}

function handleEnter(view) {
  return commitLineBreak(view, '\n\n');
}

function handleSoftEnter(view) {
  return commitLineBreak(view, '\n');
}

function commitLineBreak(view, separator) {
  const selection = view.state.selection.main;
  const from = Math.min(selection.from, selection.to);
  const to = Math.max(selection.from, selection.to);
  const insert = isCaretInsideFence(view.state) ? '\n' : separator;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
    userEvent: 'input'
  });
  return true;
}

function isCaretInsideFence(state) {
  const position = state.selection.main.head;
  const blocks = splitBlocks(state.doc.toString());
  return blocks.some((block) => block.type === 'code' && position >= block.from && position <= block.to);
}

function buildStateValue(state, frontmatterLabel, activeBlock, setActiveBlock) {
  return {
    activeBlock,
    decorations: buildDecorations(state, frontmatterLabel, activeBlock, setActiveBlock)
  };
}

function buildDecorations(state, frontmatterLabel, activeBlock, setActiveBlock) {
  const ranges = [];
  const blocks = splitBlocks(state.doc.toString());

  if (!activeBlock) {
    const widget = new RenderedMarkdownDocumentWidget(state.doc.toString(), blocks, frontmatterLabel, setActiveBlock);
    if (state.doc.length === 0) {
      ranges.push(Decoration.widget({ block: true, widget }).range(0));
    } else {
      ranges.push(Decoration.replace({ block: true, widget, inclusive: false }).range(0, state.doc.length));
    }
    return Decoration.set(ranges, true);
  }

  for (const block of blocks) {
    if (isActiveBlock(block, activeBlock)) {
      for (const lineDecoration of activeBlockLineDecorations(state, block)) {
        ranges.push(lineDecoration);
      }
      if (block.sourceTo < block.to) {
        ranges.push(Decoration.replace({ inclusive: false }).range(block.sourceTo, block.to));
      }
      continue;
    }
    ranges.push(Decoration.replace({
      block: true,
      widget: new RenderedMarkdownBlockWidget(block, frontmatterLabel, setActiveBlock),
      inclusive: false
    }).range(block.from, block.to));
  }

  return Decoration.set(ranges, true);
}

function activeBlockLineDecorations(state, block) {
  const decorations = [];
  const startLine = state.doc.lineAt(block.from);
  const endLine = state.doc.lineAt(Math.min(block.sourceTo, state.doc.length));

  for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const classes = ['cm-live-active-source-line'];
    if (lineNumber === startLine.number) classes.push('cm-live-active-source-line-first');
    if (lineNumber === endLine.number) classes.push('cm-live-active-source-line-last');
    decorations.push(Decoration.line({
      attributes: { 'data-live-line-from': String(line.from) },
      class: classes.join(' ')
    }).range(line.from));
  }

  return decorations;
}

function moveCursorInsideActiveLine(event, view) {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  const target = event.target;
  if (!(target instanceof Element)) return false;

  const lineElement = target.closest('.cm-live-active-source-line');
  if (!lineElement) return false;

  const lineFrom = Number(lineElement.getAttribute('data-live-line-from'));
  if (!Number.isFinite(lineFrom)) return false;

  const caret = caretFromPoint(event.clientX, event.clientY);
  let position = lineFrom;
  if (caret) {
    try {
      position = view.posAtDOM(caret.node, caret.offset);
    } catch {
      position = lineFrom;
    }
  }

  const line = view.state.doc.lineAt(lineFrom);
  position = Math.max(line.from, Math.min(position, line.to));
  event.preventDefault();
  view.dispatch({ selection: { anchor: position }, scrollIntoView: false, userEvent: 'select.pointer' });
  view.focus();
  return true;
}

function caretFromPoint(x, y) {
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      return { node: position.offsetNode, offset: position.offset };
    }
  }
  if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y);
    if (range) {
      return { node: range.startContainer, offset: range.startOffset };
    }
  }
  return null;
}

function isActiveBlock(block, activeBlock) {
  return activeBlock && rangesIntersect(block.from, block.sourceTo, activeBlock.from, activeBlock.sourceTo ?? activeBlock.to);
}

function rangesIntersect(leftFrom, leftTo, rightFrom, rightTo) {
  return leftFrom < rightTo && rightFrom < leftTo;
}

function splitBlocks(content) {
  const lines = content.split('\n');
  const starts = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }

  const blocks = [];
  let index = 0;

  if (lines[0] === '---') {
    const end = lines.findIndex((line, lineIndex) => lineIndex > 0 && line === '---');
    if (end > 0) {
      blocks.push(createBlock('frontmatter', lines, starts, 0, end));
      index = end + 1;
    }
  }

  while (index < lines.length) {
    if (isBlank(lines[index])) {
      index += 1;
      continue;
    }

    const start = index;
    if (isFenceStart(lines[index])) {
      index += 1;
      while (index < lines.length && !isFenceStart(lines[index])) {
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(createBlock('code', lines, starts, start, index - 1));
      continue;
    }

    if (isTableStart(lines, index)) {
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        index += 1;
      }
      blocks.push(createBlock('table', lines, starts, start, index - 1));
      continue;
    }

    if (isListLine(lines[index])) {
      index += 1;
      while (index < lines.length && (isListContinuation(lines[index]) || isBlank(lines[index]))) {
        index += 1;
      }
      blocks.push(createBlock('list', lines, starts, start, trimTrailingBlank(lines, start, index - 1)));
      continue;
    }

    if (isBlockquoteLine(lines[index])) {
      index += 1;
      while (index < lines.length && (isBlockquoteLine(lines[index]) || isBlank(lines[index]))) {
        index += 1;
      }
      blocks.push(createBlock('blockquote', lines, starts, start, trimTrailingBlank(lines, start, index - 1)));
      continue;
    }

    if (isAtxHeading(lines[index])) {
      blocks.push(createBlock('heading', lines, starts, start, start));
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && isSetextUnderline(lines[index + 1])) {
      blocks.push(createBlock('heading', lines, starts, start, index + 1));
      index += 2;
      continue;
    }

    if (isThematicBreak(lines[index])) {
      blocks.push(createBlock('thematicBreak', lines, starts, start, start));
      index += 1;
      continue;
    }

    index += 1;
    while (index < lines.length && !isBlank(lines[index]) && !startsNewBlock(lines, index)) {
      index += 1;
    }
    blocks.push(createBlock('paragraph', lines, starts, start, index - 1));
  }

  return absorbSeparators(blocks, content.length);
}

function createBlock(type, lines, starts, startLine, endLine) {
  const from = starts[startLine];
  const to = starts[endLine] + lines[endLine].length;
  const markdown = lines.slice(startLine, endLine + 1).join('\n');
  return { type, from, to, sourceTo: to, markdown };
}

function absorbSeparators(blocks, contentLength) {
  return blocks.map((block, index) => ({
    ...block,
    to: blocks[index + 1]?.from ?? contentLength
  }));
}

function startsNewBlock(lines, index) {
  return isFenceStart(lines[index])
    || isTableStart(lines, index)
    || isListLine(lines[index])
    || isBlockquoteLine(lines[index])
    || isAtxHeading(lines[index])
    || isThematicBreak(lines[index]);
}

function trimTrailingBlank(lines, start, end) {
  let nextEnd = end;
  while (nextEnd > start && isBlank(lines[nextEnd])) {
    nextEnd -= 1;
  }
  return nextEnd;
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

function isFenceStart(line) {
  return /^\s{0,3}(```|~~~)/.test(line);
}

function isAtxHeading(line) {
  return /^\s{0,3}#{1,6}(?:\s+|$)/.test(line);
}

function isSetextUnderline(line) {
  return /^\s{0,3}(=+|-+)\s*$/.test(line);
}

function isThematicBreak(line) {
  return /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
}

function isBlockquoteLine(line) {
  return /^\s{0,3}>/.test(line);
}

function isListLine(line) {
  return /^\s{0,3}(?:[-+*]|\d{1,9}[.)])\s+/.test(line);
}

function isListContinuation(line) {
  return isListLine(line) || /^\s{2,}\S/.test(line);
}

function isTableStart(lines, index) {
  return index + 1 < lines.length && isTableRow(lines[index]) && isTableDelimiter(lines[index + 1]);
}

function isTableRow(line) {
  return /^\s*\|?.+\|.+\|?\s*$/.test(line);
}

function isTableDelimiter(line) {
  return /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line);
}

class RenderedMarkdownBlockWidget extends WidgetType {
  constructor(block, frontmatterLabel, setActiveBlock) {
    super();
    this.block = block;
    this.frontmatterLabel = frontmatterLabel;
    this.setActiveBlock = setActiveBlock;
  }

  eq(other) {
    return other.block.markdown === this.block.markdown
      && other.block.type === this.block.type
      && other.frontmatterLabel === this.frontmatterLabel;
  }

  toDOM(view) {
    const container = document.createElement('div');
    container.className = `cm-live-rendered-block cm-live-rendered-${this.block.type}`;
    container.addEventListener('mousedown', (event) => {
      event.preventDefault();
      view.dispatch({
        selection: { anchor: this.block.sourceTo ?? this.block.to },
        effects: this.setActiveBlock.of(activeBlockRange(this.block)),
        scrollIntoView: true
      });
      requestLivePreviewMeasure(view);
      view.focus();
    });

    const root = createRoot(container);
    container.__mdockLiveRoot = root;
    root.render(this.renderContent());
    return container;
  }

  destroy(dom) {
    dom.__mdockLiveRoot?.unmount();
  }

  ignoreEvent() {
    return false;
  }

  renderContent() {
    if (this.block.type === 'frontmatter') {
      const { frontmatter } = splitFrontmatter(`${this.block.markdown}\n`);
      return React.createElement('section', { className: 'markdown-frontmatter', 'aria-label': this.frontmatterLabel },
        React.createElement('h4', null, this.frontmatterLabel),
        React.createElement('pre', null, frontmatter)
      );
    }

    return React.createElement('article', { className: 'markdown-preview cm-live-rendered-preview' },
      React.createElement(ReactMarkdown, {
        remarkPlugins: markdownRemarkPlugins,
        rehypePlugins: markdownRehypePlugins
      }, this.block.markdown)
    );
  }
}

class RenderedMarkdownDocumentWidget extends WidgetType {
  constructor(content, blocks, frontmatterLabel, setActiveBlock) {
    super();
    this.content = content;
    this.blocks = blocks;
    this.frontmatterLabel = frontmatterLabel;
    this.setActiveBlock = setActiveBlock;
  }

  eq(other) {
    return other.content === this.content
      && other.frontmatterLabel === this.frontmatterLabel;
  }

  toDOM(view) {
    const container = document.createElement('div');
    container.className = 'cm-live-rendered-block cm-live-full-document';
    container.addEventListener('mousedown', (event) => {
      const block = this.blockFromEventTarget(container, event.target);
      if (!block) return;
      event.preventDefault();
      view.dispatch({
        selection: { anchor: block.sourceTo ?? block.to },
        effects: this.setActiveBlock.of(activeBlockRange(block)),
        scrollIntoView: true
      });
      requestLivePreviewMeasure(view);
      view.focus();
    });

    const root = createRoot(container);
    container.__mdockLiveRoot = root;
    root.render(this.renderContent());
    return container;
  }

  destroy(dom) {
    dom.__mdockLiveRoot?.unmount();
  }

  ignoreEvent() {
    return false;
  }

  blockFromEventTarget(container, target) {
    const preview = container.querySelector('.markdown-preview');
    if (!preview || !(target instanceof Element)) return this.blocks[0] ?? null;

    const child = target.closest('.markdown-preview > *');
    if (!child) return this.blocks[0] ?? null;

    const index = Array.from(preview.children).indexOf(child);
    return this.blocks[index] ?? null;
  }

  renderContent() {
    const { frontmatter, body } = splitFrontmatter(this.content);
    return React.createElement('article', { className: 'markdown-preview cm-live-rendered-preview' },
      frontmatter
        ? React.createElement('section', { className: 'markdown-frontmatter', 'aria-label': this.frontmatterLabel },
          React.createElement('h4', null, this.frontmatterLabel),
          React.createElement('pre', null, frontmatter)
        )
        : null,
      React.createElement(ReactMarkdown, {
        remarkPlugins: markdownRemarkPlugins,
        rehypePlugins: markdownRehypePlugins
      }, body)
    );
  }
}

function activeBlockRange(block) {
  return { from: block.from, to: block.to, sourceTo: block.sourceTo };
}

function blockAtPosition(state, position) {
  const blocks = splitBlocks(state.doc.toString());
  return blocks.find((block) => position >= block.from && position < block.to) ?? blocks[blocks.length - 1] ?? null;
}

function requestLivePreviewMeasure(view) {
  const schedule = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame
    : (callback) => window.setTimeout(callback, 0);
  schedule(() => {
    if (view.destroyed) return;
    view.requestMeasure();
  });
}

export const __livePreviewInternals = {
  activeBlockRange,
  blockAtPosition,
  requestLivePreviewMeasure,
  splitBlocks,
  handleEnter,
  handleSoftEnter,
  commitLineBreak,
  isCaretInsideFence
};
