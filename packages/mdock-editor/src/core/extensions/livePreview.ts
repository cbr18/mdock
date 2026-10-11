/**
 * Live preview extension for CodeMirror 6
 * Extracted from livePreviewExtension.js
 */

import { Prec, StateEffect, StateField, Extension } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType } from '@codemirror/view';
import type { SplitBlock, LivePreviewConfig, BlockSplitterFn } from '../types';
import { splitBlocks, getSplitBlocks, blockAtPosition } from '../splitters/blockSplitter';
import { RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget, activeBlockRange, requestLivePreviewMeasure } from '../widgets/RenderedBlockWidget';

/**
 * State effect for setting the active block
 */
export const setActiveBlock = StateEffect.define<{
  from: number;
  to: number;
  sourceTo: number;
} | null>();

/**
 * Create Enter key handler
 */
function createHandleEnter(setActiveBlock: typeof setActiveBlock) {
  return (view: EditorView) => {
    return commitLineBreak(view, '\n\n', setActiveBlock);
  };
}

/**
 * Create Shift+Enter key handler
 */
function createHandleSoftEnter(setActiveBlock: typeof setActiveBlock) {
  return (view: EditorView) => {
    return commitLineBreak(view, '\n', setActiveBlock);
  };
}

/**
 * Commit a line break
 */
function commitLineBreak(view: EditorView, separator: string, setActiveBlock: typeof setActiveBlock): boolean {
  const selection = view.state.selection.main;
  const from = Math.min(selection.from, selection.to);
  const to = Math.max(selection.from, selection.to);
  const insert = isCaretInsideFence(view.state) ? '\n' : separator;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
    userEvent: 'input',
    effects: [setActiveBlock.of(null)],
  });
  return true;
}

/**
 * Check if caret is inside a code fence
 */
function isCaretInsideFence(state: EditorState): boolean {
  const position = state.selection.main.head;
  const blocks = splitBlocks(state.doc.toString());
  return blocks.some((block) => block.type === 'code' && position >= block.from && position <= block.to);
}

/**
 * Move cursor by logical line (for wrapped lines in live preview)
 */
function moveLogicalLine(direction: number) {
  return (view: EditorView) => {
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

/**
 * Move cursor inside active line on mousedown
 */
function moveCursorInsideActiveLine(event: MouseEvent, view: EditorView): boolean {
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

/**
 * Get caret position from point
 */
function caretFromPoint(x: number, y: number) {
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

/**
 * Main live preview extension factory
 */
export function livePreviewExtension(config: LivePreviewConfig = { frontmatterLabel: 'Frontmatter' }): Extension[] {
  const {
    frontmatterLabel = 'Frontmatter',
    renderPlugins,
    blockSplitter = getSplitBlocks,
    widgets,
    keymap: customKeymap,
    onBlockActivate,
  } = config;

  const handleEnter = createHandleEnter(setActiveBlock);
  const handleSoftEnter = createHandleSoftEnter(setActiveBlock);

  // State field for decorations and active block tracking
  const field = StateField.define<{
    activeBlock: { from: number; to: number; sourceTo: number } | null;
    decorations: DecorationSet;
  }>({
    create(state) {
      return buildStateValue(state, frontmatterLabel, null, setActiveBlock, blockSplitter, renderPlugins, widgets);
    },
    update(value, transaction) {
      let activeBlock = value.activeBlock;

      if (activeBlock && transaction.docChanged) {
        activeBlock = {
          from: transaction.changes.mapPos(activeBlock.from),
          to: transaction.changes.mapPos(activeBlock.to),
          sourceTo: transaction.changes.mapPos(activeBlock.sourceTo ?? activeBlock.to),
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
          decorations: value.decorations.map(transaction.changes),
        };
      }

      return buildStateValue(transaction.state, frontmatterLabel, activeBlock, setActiveBlock, blockSplitter, renderPlugins, widgets);
    },
    provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
  });

  // Call onBlockActivate callback when active block changes
  const activateField = StateField.define<{
    prevActiveBlock: { from: number; to: number; sourceTo: number } | null;
  }>({
    create() {
      return { prevActiveBlock: null };
    },
    update(value, transaction) {
      for (const effect of transaction.effects) {
        if (effect.is(setActiveBlock)) {
          const newBlock = effect.value;
          if (newBlock !== value.prevActiveBlock && onBlockActivate) {
            // Find the block that was activated
            const blocks = blockSplitter(transaction.state.doc.toString());
            const activatedBlock = blocks.find(
              (b) => b.from === newBlock?.from && b.to === newBlock?.to
            );
            if (activatedBlock) {
              // Defer to next tick to avoid state update during transaction
              queueMicrotask(() => onBlockActivate(activatedBlock));
            }
          }
          return { prevActiveBlock: newBlock };
        }
      }
      return value;
    },
  });

  const extensions: Extension[] = [
    field,
    activateField,
    history({ minDepth: 100, joinToNextChar: /^[\w\s]*$/ }),
    Prec.highest(keymap.of([
      { key: 'ArrowUp', run: moveLogicalLine(-1) },
      { key: 'ArrowDown', run: moveLogicalLine(1) },
      { key: 'Enter', run: handleEnter },
      { key: 'Shift-Enter', run: handleSoftEnter },
    ])),
    Prec.highest(EditorView.domEventHandlers({
      mousedown: moveCursorInsideActiveLine,
      keydown(event, view) {
        if ((event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || event.altKey || event.ctrlKey || event.metaKey) {
          return false;
        }
        const handled = moveLogicalLine(event.key === 'ArrowUp' ? -1 : 1)(view);
        if (handled) {
          event.preventDefault();
        }
        return handled;
      },
    })),
  ];

  // Add custom keymap if provided
  if (customKeymap && customKeymap.length > 0) {
    extensions.push(Prec.highest(keymap.of(customKeymap)));
  }

  return extensions;
}

/**
 * Build state value with decorations
 */
function buildStateValue(
  state: EditorState,
  frontmatterLabel: string,
  activeBlock: { from: number; to: number; sourceTo: number } | null,
  setActiveBlock: typeof setActiveBlock,
  blockSplitter: BlockSplitterFn,
  renderPlugins?: { remark?: any[]; rehype?: any[] },
  widgets?: { block?: WidgetType; document?: WidgetType }
) {
  return {
    activeBlock,
    decorations: buildDecorations(state, frontmatterLabel, activeBlock, setActiveBlock, blockSplitter, renderPlugins, widgets),
  };
}

/**
 * Build decorations for live preview
 */
function buildDecorations(
  state: EditorState,
  frontmatterLabel: string,
  activeBlock: { from: number; to: number; sourceTo: number } | null,
  setActiveBlock: typeof setActiveBlock,
  blockSplitter: BlockSplitterFn,
  renderPlugins?: { remark?: any[]; rehype?: any[] },
  widgets?: { block?: WidgetType; document?: WidgetType }
): DecorationSet {
  const ranges: Decoration[] = [];
  const blocks = blockSplitter(state.doc.toString());

  if (!activeBlock) {
    const widget = widgets?.document ?? new RenderedMarkdownDocumentWidget(
      state.doc.toString(),
      blocks,
      frontmatterLabel,
      setActiveBlock,
      renderPlugins
    );

    if (state.doc.length === 0) {
      ranges.push(Decoration.widget({ block: true, widget }).range(0));
    } else {
      ranges.push(Decoration.replace({ block: true, widget, inclusive: false }).range(0, state.doc.length));
    }
    return Decoration.set(ranges, true);
  }

  for (const block of blocks) {
    if (isActiveBlock(block, activeBlock)) {
      // Active block: show source lines with highlighting
      for (const lineDecoration of activeBlockLineDecorations(state, block)) {
        ranges.push(lineDecoration);
      }
      if (block.sourceTo < block.to) {
        ranges.push(Decoration.replace({ inclusive: false }).range(block.sourceTo, block.to));
      }
      continue;
    }

    // Rendered block
    ranges.push(Decoration.replace({
      block: true,
      widget: widgets?.block ?? new RenderedMarkdownBlockWidget(block, frontmatterLabel, setActiveBlock, renderPlugins),
      inclusive: false,
    }).range(block.from, block.to));
  }

  return Decoration.set(ranges, true);
}

/**
 * Create line decorations for active source block
 */
function activeBlockLineDecorations(state: EditorState, block: SplitBlock): Decoration[] {
  const decorations: Decoration[] = [];
  const startLine = state.doc.lineAt(block.from);
  const endLine = state.doc.lineAt(Math.min(block.sourceTo, state.doc.length));

  for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber++) {
    const line = state.doc.line(lineNumber);
    const classes = ['cm-live-active-source-line'];
    if (lineNumber === startLine.number) classes.push('cm-live-active-source-line-first');
    if (lineNumber === endLine.number) classes.push('cm-live-active-source-line-last');

    decorations.push(Decoration.line({
      attributes: { 'data-live-line-from': String(line.from) },
      class: classes.join(' '),
    }).range(line.from));
  }

  return decorations;
}

/**
 * Check if a block is the active block
 */
function isActiveBlock(block: SplitBlock, activeBlock: { from: number; sourceTo: number } | null): boolean {
  if (!activeBlock) return false;
  return block.from < activeBlock.sourceTo && activeBlock.from < block.sourceTo;
}