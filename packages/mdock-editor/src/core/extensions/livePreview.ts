/**
 * Live preview extension for CodeMirror 6
 * Extracted from livePreviewExtension.js
 */

import { Prec, StateEffect, StateField, Extension } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType } from '@codemirror/view';
import { cursorCharLeft, cursorCharRight, cursorGroupBackward, cursorGroupForward, cursorLineBoundaryBackward, cursorLineBoundaryForward, selectCharLeft, selectCharRight, selectGroupBackward, selectGroupForward, selectLineBoundaryBackward, selectLineBoundaryForward, selectLineDown, selectLineUp, history } from '@codemirror/commands';
import type { SplitBlock, LivePreviewConfig, BlockSplitterFn } from '../types';
import { splitBlocks, getSplitBlocks, blockAtPosition } from '../splitters/blockSplitter';
import { RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget, activeBlockRange, requestLivePreviewMeasure, cursorPositionFromClick, isActiveBlock } from '../widgets/RenderedBlockWidget';

/**
 * Navigate to a page in the vault, optionally with heading/block reference
 */
export function navigateToPage(pagePath: string, headingRef?: string, blockRef?: string): void {
  // Navigate to the page in the web app
  const baseUrl = window.location.origin + window.location.pathname;
  const url = new URL(baseUrl);
  url.searchParams.set('page', pagePath);
  
  // Add fragment for heading/block reference
  if (headingRef) {
    url.hash = headingRef;
  } else if (blockRef) {
    url.hash = `^${blockRef}`;
  }
  
  window.location.href = url.toString();
}

/**
 * Scroll to heading or block within the current page
 */
export function scrollToRef(headingRef?: string, blockRef?: string): void {
  if (headingRef) {
    const element = document.getElementById(headingRef) || document.querySelector(`[data-heading-slug="${headingRef}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Flash highlight
      element.classList.add('cm-ref-highlight');
      setTimeout(() => element.classList.remove('cm-ref-highlight'), 2000);
    }
  } else if (blockRef) {
    const element = document.querySelector(`[data-block-id="${blockRef}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('cm-ref-highlight');
      setTimeout(() => element.classList.remove('cm-ref-highlight'), 2000);
    }
  }
}

/**
 * State for tracking focused block (has cursor but not in edit mode)
 */
export interface FocusedBlock {
  from: number;
  to: number;
  sourceTo: number;
  blockIndex: number;
}

/**
 * State effect for setting the focused block (cursor position without edit mode)
 */
export const setFocusedBlock = StateEffect.define<FocusedBlock | null>();

/**
 * State effect for setting the active block (edit mode)
 */
export const setActiveBlock = StateEffect.define<{
  from: number;
  to: number;
  sourceTo: number;
} | null>();

/**
 * Click tracking for double-click detection
 */
let lastClickTime = 0;
let lastClickBlock: FocusedBlock | null = null;
const DOUBLE_CLICK_THRESHOLD = 300; // ms

/**
 * Touch tracking for mobile interactions
 */
interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  startTarget: EventTarget | null;
  block: FocusedBlock | null;
  isLongPress: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isPinching: boolean;
  initialPinchDistance: number;
  pinchTarget: HTMLElement | null;
  lastTouchX: number;
  lastTouchY: number;
}

const touchState: TouchState = {
  startTime: 0,
  startX: 0,
  startY: 0,
  startTarget: null,
  block: null,
  isLongPress: false,
  longPressTimer: null,
  isPinching: false,
  initialPinchDistance: 0,
  pinchTarget: null,
  lastTouchX: 0,
  lastTouchY: 0,
};

const LONG_PRESS_DELAY = 500; // ms
const TOUCH_MOVE_THRESHOLD = 10; // px - movement allowed before canceling tap/long-press
const DOUBLE_TAP_THRESHOLD = 300; // ms
let lastTouchEndTime = 0;
let lastTouchEndBlock: FocusedBlock | null = null;

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

  // State field for decorations, active block, and focused block tracking
  const field = StateField.define<{
    activeBlock: { from: number; to: number; sourceTo: number } | null;
    focusedBlock: FocusedBlock | null;
    decorations: DecorationSet;
  }>({
    create: function (state) {
      return buildStateValue(state, frontmatterLabel, null, null, setActiveBlock, setFocusedBlock, blockSplitter, renderPlugins, widgets);
    },
    update: function (value, transaction) {
      let activeBlock = value.activeBlock;
      let focusedBlock = value.focusedBlock;

      if (activeBlock && transaction.docChanged) {
        activeBlock = {
          from: transaction.changes.mapPos(activeBlock.from),
          to: transaction.changes.mapPos(activeBlock.to),
          sourceTo: transaction.changes.mapPos(activeBlock.sourceTo ?? activeBlock.to),
        };
      }

      if (focusedBlock && transaction.docChanged) {
        focusedBlock = {
          from: transaction.changes.mapPos(focusedBlock.from),
          to: transaction.changes.mapPos(focusedBlock.to),
          sourceTo: transaction.changes.mapPos(focusedBlock.sourceTo ?? focusedBlock.to),
          blockIndex: focusedBlock.blockIndex,
        };
      }

      for (const effect of transaction.effects) {
        if (effect.is(setActiveBlock)) {
          activeBlock = effect.value;
          // Clear focused block when activating
          if (effect.value) {
            focusedBlock = null;
          }
        }
        if (effect.is(setFocusedBlock)) {
          focusedBlock = effect.value;
        }
      }

      // Auto-activate on typing when there's a focused block but no active block
      if (!activeBlock && focusedBlock && transaction.isUserEvent('input')) {
        // Check if the change is near the focused block
        const sel = transaction.state.selection.main;
        if (sel.from >= focusedBlock.from && sel.to <= focusedBlock.to) {
          activeBlock = { ...focusedBlock };
          focusedBlock = null;
        }
      }

      // Clear focused block if selection moves away from it
      if (focusedBlock && transaction.selection) {
        const sel = transaction.state.selection.main;
        if (sel.from < focusedBlock.from || sel.to > focusedBlock.to) {
          focusedBlock = null;
        }
      }

      if (!transaction.docChanged && !transaction.selection && transaction.effects.length === 0) {
        return {
          activeBlock,
          focusedBlock,
          decorations: value.decorations.map(transaction.changes),
        };
      }

      return buildStateValue(transaction.state, frontmatterLabel, activeBlock, focusedBlock, setActiveBlock, setFocusedBlock, blockSplitter, renderPlugins, widgets);
    },
    provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
  });

  // Call onBlockActivate callback when active block changes
  const activateField = StateField.define<{
    prevActiveBlock: { from: number; to: number; sourceTo: number } | null;
  }>({
    create: function () {
      return { prevActiveBlock: null };
    },
    update: function (value, transaction) {
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

  // Handler for clicking on rendered blocks (no active block)
  function handleRenderedBlockClick(event: MouseEvent, view: EditorView): boolean {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    
    // Check if clicked on a wikilink
    const wikilink = target.closest('.cm-wikilink');
    if (wikilink) {
      const pagePath = wikilink.getAttribute('data-page-path');
      const headingRef = wikilink.getAttribute('data-heading-ref') || undefined;
      const blockRef = wikilink.getAttribute('data-block-ref') || undefined;
      
      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+Click -> navigate to page with heading/block ref
        event.preventDefault();
        event.stopPropagation();
        navigateToPage(pagePath, headingRef, blockRef);
        return true;
      }
      // Regular click on wikilink - let it focus
      return false;
    }

    // Find the block that was clicked
    const blocks = blockSplitter(view.state.doc.toString());
    const block = findBlockAtPosition(view, event, blocks);
    if (!block) return false;

    const now = Date.now();
    const isDoubleClick = (now - lastClickTime) < DOUBLE_CLICK_THRESHOLD && 
                          lastClickBlock && 
                          lastClickBlock.from === block.from && 
                          lastClickBlock.to === block.to;

    lastClickTime = now;
    lastClickBlock = { from: block.from, to: block.to, sourceTo: block.sourceTo, blockIndex: blocks.indexOf(block) };

    if (isDoubleClick) {
      // Double-click -> activate block (switch to source edit)
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        effects: setActiveBlock.of(activeBlockRange(block)),
      });
      view.focus();
      return true;
    }

    // Single click -> place cursor at position, set focused block (no edit mode)
    const position = cursorPositionFromClick(view, event, block.from, block.to);
    view.dispatch({
      selection: { anchor: position },
      effects: setFocusedBlock.of({ from: block.from, to: block.to, sourceTo: block.sourceTo, blockIndex: blocks.indexOf(block) }),
      scrollIntoView: true,
    });
    view.focus();
    return true;
  }

  // Handler for clicking on active block source lines
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

  // ==========================================================================
  // Touch Event Handlers for Mobile Support
  // ==========================================================================

  function findBlockAtTouch(view: EditorView, event: TouchEvent, blocks: SplitBlock[]): FocusedBlock | null {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return null;

    const caret = caretFromPoint(touch.clientX, touch.clientY);
    if (!caret) return null;

    try {
      const position = view.posAtDOM(caret.node, caret.offset);
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (position >= block.from && position <= block.to) {
          return { from: block.from, to: block.to, sourceTo: block.sourceTo, blockIndex: i };
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  function getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getPinchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  function findPinchTarget(element: Element | null): HTMLElement | null {
    if (!element) return null;
    const target = element.closest('.embed-image img, .mermaid-diagram svg, .embed-pdf iframe');
    return target as HTMLElement | null;
  }

  function handleTouchStart(event: TouchEvent, view: EditorView): boolean {
    const touch = event.touches[0];
    if (!touch) return false;

    const target = touch.target;
    if (!(target instanceof Element)) return false;

    const blocks = blockSplitter(view.state.doc.toString());
    const block = findBlockAtTouch(view, event, blocks);
    
    touchState.startTime = Date.now();
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.startTarget = target;
    touchState.block = block;
    touchState.isLongPress = false;
    touchState.lastTouchX = touch.clientX;
    touchState.lastTouchY = touch.clientY;

    // Check for pinch gesture (two fingers)
    if (event.touches.length === 2) {
      const pinchTarget = findPinchTarget(target);
      if (pinchTarget) {
        touchState.isPinching = true;
        touchState.initialPinchDistance = getDistance(event.touches[0], event.touches[1]);
        touchState.pinchTarget = pinchTarget;
        // Prevent default to allow pinch zoom
        event.preventDefault();
        return true;
      }
    }

    // Start long-press timer for context menu
    if (block && !touchState.isPinching) {
      touchState.longPressTimer = window.setTimeout(() => {
        touchState.isLongPress = true;
        showContextMenu(view, block, touchState.startX, touchState.startY, target);
      }, LONG_PRESS_DELAY);
    }

    // Allow text selection by default
    return false;
  }

  function handleTouchMove(event: TouchEvent, view: EditorView): boolean {
    const touch = event.touches[0];
    if (!touch) return false;

    // Handle pinch zoom
    if (touchState.isPinching && event.touches.length === 2 && touchState.pinchTarget) {
      const distance = getDistance(event.touches[0], event.touches[1]);
      const scale = distance / touchState.initialPinchDistance;
      const clampedScale = Math.max(0.5, Math.min(3, scale));
      
      touchState.pinchTarget.style.transform = `scale(${clampedScale})`;
      touchState.pinchTarget.style.transformOrigin = 'center center';
      event.preventDefault();
      return true;
    }

    // Cancel long-press if moved too far
    if (touchState.longPressTimer && !touchState.isLongPress) {
      const dx = touch.clientX - touchState.startX;
      const dy = touch.clientY - touchState.startY;
      if (Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(touchState.longPressTimer!);
        touchState.longPressTimer = null;
      }
    }

    touchState.lastTouchX = touch.clientX;
    touchState.lastTouchY = touch.clientY;
    return false;
  }

  function handleTouchEnd(event: TouchEvent, view: EditorView): boolean {
    // Clear long-press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }

    // Handle pinch zoom end
    if (touchState.isPinching) {
      touchState.isPinching = false;
      if (touchState.pinchTarget) {
        // Keep the zoom level, but allow reset on double-tap
        touchState.pinchTarget.dataset.zoomLevel = touchState.pinchTarget.style.transform;
      }
      touchState.pinchTarget = null;
      return true;
    }

    // If long-press was triggered, context menu is already shown
    if (touchState.isLongPress) {
      touchState.isLongPress = false;
      return true;
    }

    const touch = event.changedTouches[0];
    if (!touch) return false;

    const target = touch.target;
    if (!(target instanceof Element)) return false;

    const now = Date.now();
    const timeSinceStart = now - touchState.startTime;
    const dx = touch.clientX - touchState.startX;
    const dy = touch.clientY - touchState.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check for double-tap on same block
    const blocks = blockSplitter(view.state.doc.toString());
    const block = findBlockAtTouch(view, event, blocks);
    
    const isDoubleTap = 
      timeSinceStart < DOUBLE_TAP_THRESHOLD &&
      (now - lastTouchEndTime) < DOUBLE_TAP_THRESHOLD &&
      block &&
      lastTouchEndBlock &&
      lastTouchEndBlock.from === block.from &&
      lastTouchEndBlock.to === block.to;

    lastTouchEndTime = now;
    lastTouchEndBlock = block;

    if (isDoubleTap && block) {
      // Double-tap -> activate block (switch to source edit)
      event.preventDefault();
      view.dispatch({
        effects: setActiveBlock.of(activeBlockRange({
          from: block.from,
          to: block.to,
          sourceTo: block.sourceTo,
        } as SplitBlock)),
      });
      view.focus();
      
      // Show virtual keyboard by focusing the editor
      const editorElement = view.dom.querySelector('.cm-content');
      if (editorElement) {
        (editorElement as HTMLElement).focus();
      }
      return true;
    }

    // Single tap -> place cursor (if not a drag)
    if (distance <= TOUCH_MOVE_THRESHOLD && timeSinceStart < 300 && block) {
      const position = cursorPositionFromTouch(view, touch, block.from, block.to);
      view.dispatch({
        selection: { anchor: position },
        effects: setFocusedBlock.of(block),
        scrollIntoView: true,
      });
      view.focus();
      return true;
    }

    // Allow text selection for drags
    return false;
  }

  function handleTouchCancel(event: TouchEvent, view: EditorView): boolean {
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    touchState.isLongPress = false;
    touchState.isPinching = false;
    touchState.pinchTarget = null;
    hideContextMenu();
    return false;
  }

  function cursorPositionFromTouch(
    view: EditorView,
    touch: Touch,
    blockFrom: number,
    blockTo: number
  ): number {
    const caret = caretFromPoint(touch.clientX, touch.clientY);
    if (!caret) return blockFrom;

    try {
      const position = view.posAtDOM(caret.node, caret.offset);
      const line = view.state.doc.lineAt(position);
      return Math.max(line.from, Math.min(position, line.to));
    } catch {
      return blockFrom;
    }
  }

  // Context menu state
  let contextMenuElement: HTMLElement | null = null;

  function showContextMenu(
    view: EditorView,
    block: FocusedBlock,
    x: number,
    y: number,
    target: EventTarget
  ): void {
    hideContextMenu();

    const element = target instanceof Element ? target : null;
    const wikilink = element?.closest('.cm-wikilink');
    const embed = element?.closest('.embed');
    const image = element?.closest('.embed-image img');
    const mermaid = element?.closest('.mermaid-diagram svg');

    const actions: Array<{ label: string; action: () => void }> = [];

    if (wikilink) {
      const pagePath = wikilink.getAttribute('data-page-path');
      const headingRef = wikilink.getAttribute('data-heading-ref') || undefined;
      const blockRef = wikilink.getAttribute('data-block-ref') || undefined;

      actions.push(
        { label: 'Open Link', action: () => navigateToPage(pagePath, headingRef, blockRef) },
        { label: 'Copy Link', action: () => copyToClipboard(`[[${pagePath}${headingRef ? '#' + headingRef : ''}${blockRef ? '#^' + blockRef : ''}}]]`) },
        { label: 'Copy Page Path', action: () => copyToClipboard(pagePath) }
      );
    } else if (embed) {
      const src = embed.querySelector('img')?.getAttribute('src') || 
                  embed.querySelector('iframe')?.getAttribute('src') || 
                  embed.querySelector('video')?.getAttribute('src') ||
                  embed.querySelector('audio')?.getAttribute('src');
      if (src) {
        actions.push(
          { label: 'Open Embed', action: () => window.open(src, '_blank') },
          { label: 'Copy Embed URL', action: () => copyToClipboard(src) },
          { label: 'Copy Embed Markdown', action: () => copyToClipboard(`![${embed.querySelector('img')?.alt || 'embed'}](${src})`) }
        );
      }
    } else if (image) {
      const src = image.getAttribute('src');
      const alt = image.getAttribute('alt') || '';
      if (src) {
        actions.push(
          { label: 'Open Image', action: () => window.open(src, '_blank') },
          { label: 'Copy Image URL', action: () => copyToClipboard(src) },
          { label: 'Copy Image Markdown', action: () => copyToClipboard(`![${alt}](${src})`) }
        );
      }
    } else if (mermaid) {
      actions.push(
        { label: 'Open Diagram Fullscreen', action: () => {
          // Trigger fullscreen via existing mermaid toolbar
          const container = mermaid.closest('.mermaid-container');
          const fullscreenBtn = container?.querySelector('[data-action="fullscreen"]') as HTMLButtonElement;
          fullscreenBtn?.click();
        }},
        { label: 'Copy Diagram Source', action: () => {
          const container = mermaid.closest('.mermaid-container');
          const copyBtn = container?.querySelector('[data-action="copy"]') as HTMLButtonElement;
          copyBtn?.click();
        }}
      );
    }

    if (actions.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'cm-touch-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${Math.min(x + 10, window.innerWidth - 220)}px;
      top: ${Math.min(y + 10, window.innerHeight - actions.length * 44 - 20)}px;
      z-index: 10000;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
      min-width: 200px;
      max-width: 280px;
      padding: 4px;
      animation: cm-context-menu-in 150ms ease-out;
    `;

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.style.cssText = `
        display: block;
        width: 100%;
        min-height: 44px;
        padding: 10px 16px;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--text);
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        touch-action: manipulation;
      `;
      btn.addEventListener('click', () => {
        action.action();
        hideContextMenu();
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--surface-hover)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    contextMenuElement = menu;

    // Dismiss on outside click
    setTimeout(() => {
      document.addEventListener('click', dismissContextMenu, { once: true });
      document.addEventListener('touchstart', dismissContextMenu, { once: true });
    }, 0);
  }

  function hideContextMenu(): void {
    if (contextMenuElement) {
      contextMenuElement.style.animation = 'cm-context-menu-out 100ms ease-in forwards';
      setTimeout(() => {
        contextMenuElement?.remove();
        contextMenuElement = null;
      }, 100);
    }
  }

  function dismissContextMenu(event: Event): void {
    if (contextMenuElement && !contextMenuElement.contains(event.target as Node)) {
      hideContextMenu();
    }
  }

  function copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    });
  }

  const extensions: Extension[] = [
    field,
    activateField,
    // headingTrackingField, // TODO: Fix parsing issue
    history({ minDepth: 100, joinToNextChar: /^[\w\s]*$/ }),
    Prec.highest(keymap.of([
      // Line navigation (visual lines in live preview)
      { key: 'ArrowUp', run: moveLogicalLine(-1) },
      { key: 'ArrowDown', run: moveLogicalLine(1) },
      // Character/word navigation
      { key: 'ArrowLeft', run: cursorCharLeft },
      { key: 'ArrowRight', run: cursorCharRight },
      { key: 'Ctrl-ArrowLeft', run: cursorGroupBackward },
      { key: 'Ctrl-ArrowRight', run: cursorGroupForward },
      // Line boundaries
      { key: 'Home', run: cursorLineBoundaryBackward },
      { key: 'End', run: cursorLineBoundaryForward },
      // Viewport scrolling
      { key: 'PageUp', run: (view) => { view.dispatch({ scrollIntoView: -view.viewportHeight }); return true; } },
      { key: 'PageDown', run: (view) => { view.dispatch({ scrollIntoView: view.viewportHeight }); return true; } },
      // Selection extension
      { key: 'Shift-ArrowUp', run: selectLineUp },
      { key: 'Shift-ArrowDown', run: selectLineDown },
      { key: 'Shift-ArrowLeft', run: selectCharLeft },
      { key: 'Shift-ArrowRight', run: selectCharRight },
      { key: 'Shift-Home', run: selectLineBoundaryBackward },
      { key: 'Shift-End', run: selectLineBoundaryForward },
      { key: 'Ctrl-Shift-ArrowLeft', run: selectGroupBackward },
      { key: 'Ctrl-Shift-ArrowRight', run: selectGroupForward },
      // Editing
      { key: 'Enter', run: handleEnter },
      { key: 'Shift-Enter', run: handleSoftEnter },
    ])),
    Prec.highest(EditorView.domEventHandlers({
      mousedown(event, view) {
        // Allow text selection - don't preventDefault unless it's a double-click
        // The click handler will handle double-click detection
        const target = event.target;
        if (!(target instanceof Element)) return false;
        
        // Check if clicking on wikilink
        const wikilink = target.closest('.cm-wikilink');
        if (wikilink && (event.ctrlKey || event.metaKey)) {
          // Ctrl/Cmd+Click on wikilink - navigate
          return false; // Let click handler deal with it
        }
        
        // For active source lines, use existing handler
        if (target.closest('.cm-live-active-source-line')) {
          return moveCursorInsideActiveLine(event, view);
        }
        
        // For rendered blocks, don't preventDefault to allow text selection
        // The click handler will handle cursor placement
        return false;
      },
      touchstart(event, view) {
        return handleTouchStart(event, view);
      },
      touchmove(event, view) {
        return handleTouchMove(event, view);
      },
      touchend(event, view) {
        return handleTouchEnd(event, view);
      },
      touchcancel(event, view) {
        return handleTouchCancel(event, view);
      },
      click: handleRenderedBlockClick,
      mouseover(event, view) {
        // Show tooltip on wikilink hover
        const target = event.target;
        if (!(target instanceof Element)) return false;
        
        const wikilink = target.closest('.cm-wikilink');
        if (wikilink) {
          const pagePath = wikilink.getAttribute('data-page-path');
          const tooltip = document.createElement('div');
          tooltip.className = 'cm-wikilink-tooltip';
          tooltip.textContent = wikilink.textContent || pagePath;
          tooltip.style.cssText = `
            position: fixed;
            left: ${event.clientX + 12}px;
            top: ${event.clientY + 12}px;
            z-index: 1000;
            max-width: 300px;
            padding: 8px 12px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 6px;
            box-shadow: var(--shadow);
            font-size: 13px;
            line-height: 1.5;
            pointer-events: none;
          `;
          document.body.appendChild(tooltip);
          
          // Store tooltip reference for removal
          (wikilink as HTMLElement & { _tooltip?: HTMLElement })._tooltip = tooltip;
          return true;
        }
        return false;
      },
      mouseout(event, view) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        
        const wikilink = target.closest('.cm-wikilink');
        if (wikilink) {
          const tooltip = (wikilink as HTMLElement & { _tooltip?: HTMLElement })._tooltip;
          if (tooltip) {
            tooltip.remove();
            delete (wikilink as HTMLElement & { _tooltip?: HTMLElement })._tooltip;
          }
          return true;
        }
        return false;
      },
      keydown(event, view) {
        // Arrow key navigation in live preview (including selection, word nav, etc.)
        const isNavigationKey = 
          event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
          event.key === 'Home' || event.key === 'End' ||
          event.key === 'PageUp' || event.key === 'PageDown';
        
        // Allow Shift for selection, Ctrl/Cmd for word navigation
        const hasModifier = event.shiftKey || event.ctrlKey || event.metaKey;
        
        if (!isNavigationKey && !hasModifier) {
          return false;
        }
        
        // Let the keymap handle it
        return false;
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
 * Find block at click position
 */
function findBlockAtPosition(view: EditorView, event: MouseEvent, blocks: SplitBlock[]): SplitBlock | null {
  const caret = caretFromPoint(event.clientX, event.clientY);
  if (!caret) return null;

  try {
    const position = view.posAtDOM(caret.node, caret.offset);
    for (const block of blocks) {
      if (position >= block.from && position <= block.to) {
        return block;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Build state value with decorations
 */
function buildStateValue(
  state: EditorState,
  frontmatterLabel: string,
  activeBlock: { from: number; to: number; sourceTo: number } | null,
  focusedBlock: FocusedBlock | null,
  setActiveBlock: typeof setActiveBlock,
  setFocusedBlock: typeof setFocusedBlock,
  blockSplitter: BlockSplitterFn,
  renderPlugins?: { remark?: any[]; rehype?: any[] },
  widgets?: { block?: WidgetType; document?: WidgetType }
) {
  return {
    activeBlock,
    focusedBlock,
    decorations: buildDecorations(state, frontmatterLabel, activeBlock, focusedBlock, setActiveBlock, setFocusedBlock, blockSplitter, renderPlugins, widgets),
  };
}

/**
 * Build decorations for live preview
 */
function buildDecorations(
  state: EditorState,
  frontmatterLabel: string,
  activeBlock: { from: number; to: number; sourceTo: number } | null,
  focusedBlock: FocusedBlock | null,
  setActiveBlock: typeof setActiveBlock,
  setFocusedBlock: typeof setFocusedBlock,
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
      setFocusedBlock, // Pass setFocusedBlock instead of setActiveBlock
      renderPlugins
    );

    if (state.doc.length === 0) {
      ranges.push(Decoration.widget({ block: true, widget }).range(0));
    } else {
      ranges.push(Decoration.replace({ block: true, widget, inclusive: false }).range(0, state.doc.length));
    }
    return Decoration.set(ranges, true);
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
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

    // Check if this is the focused block (for hover indicator)
    const isFocused = focusedBlock && focusedBlock.blockIndex === i;

    // Rendered block
    ranges.push(Decoration.replace({
      block: true,
      widget: widgets?.block ?? new RenderedMarkdownBlockWidget(block, frontmatterLabel, setFocusedBlock, setActiveBlock, renderPlugins, isFocused),
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