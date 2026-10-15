/**
 * Live preview widgets for rendered Markdown blocks
 * Extracted from livePreviewExtension.js
 */

import { WidgetType } from '@codemirror/view';
import { createRoot } from 'react-dom/client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { SplitBlock } from '../types';
import type { EditorView } from '@codemirror/view';

/**
 * Cursor position from click event
 */
export interface CursorPosition {
  node: Node;
  offset: number;
}

/**
 * Get cursor position from click coordinates
 */
export function caretFromPoint(x: number, y: number): CursorPosition | null {
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
 * Get cursor position from click within a block widget
 */
export function cursorPositionFromClick(
  view: EditorView,
  event: MouseEvent,
  blockFrom: number,
  blockTo: number
): number {
  const caret = caretFromPoint(event.clientX, event.clientY);
  if (!caret) return blockFrom;

  try {
    const position = view.posAtDOM(caret.node, caret.offset);
    const line = view.state.doc.lineAt(position);
    return Math.max(line.from, Math.min(position, line.to));
  } catch {
    return blockFrom;
  }
}

/**
 * Active block range for decoration
 */
export function activeBlockRange(block: SplitBlock) {
  return { from: block.from, to: block.to, sourceTo: block.sourceTo };
}

/**
 * Check if a block is the active block
 */
export function isActiveBlock(block: SplitBlock, activeBlock: { from: number; sourceTo: number } | null): boolean {
  if (!activeBlock) return false;
  return rangesIntersect(block.from, block.sourceTo, activeBlock.from, activeBlock.sourceTo);
}

/**
 * Check if two ranges intersect
 */
export function rangesIntersect(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom < rightTo && rightFrom < leftTo;
}

/**
 * Extended wikilink match with heading/block references
 */
export interface WikilinkMatch {
  pagePath: string;
  alias: string | null;
  fullMatch: string;
  headingRef?: string;
  blockRef?: string;
}

/**
 * Find wikilinks in text
 * Supports: [[Page]], [[Page|Alias]], [[Page#Heading]], [[Page#^block-id]], [[Page#Heading|Alias]]
 */
export function findWikilinks(text: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  // Regex captures: pagePath (with optional #heading or #^block), alias
  const regex = /\[\[([^\|\]]+?)(?:#([^\|\]]+))?(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const pagePath = match[1];
    const ref = match[2]; // heading or ^block-id
    const alias = match[3] || null;
    
    let headingRef: string | undefined;
    let blockRef: string | undefined;
    
    if (ref) {
      if (ref.startsWith('^')) {
        blockRef = ref.slice(1);
      } else {
        headingRef = ref;
      }
    }
    
    matches.push({
      pagePath,
      alias,
      fullMatch: match[0],
      headingRef,
      blockRef,
    });
  }
  return matches;
}

/**
 * Process wikilinks in markdown and convert to React elements with click handlers
 * Handles [[Page]], [[Page|Alias]], [[Page#Heading]], [[Page#^block-id]], [[Page#Heading|Alias]]
 */
export function processWikilinks(
  markdown: string,
  onWikilinkClick: (pagePath: string, alias: string | null, headingRef?: string, blockRef?: string) => void
): React.ReactNode {
  const matches: WikilinkMatch[] = [];
  const regex = /\[\[([^\|\]]+?)(?:#([^\|\]]+))?(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const pagePath = match[1];
    const ref = match[2];
    const alias = match[3] || null;
    
    let headingRef: string | undefined;
    let blockRef: string | undefined;
    
    if (ref) {
      if (ref.startsWith('^')) {
        blockRef = ref.slice(1);
      } else {
        headingRef = ref;
      }
    }
    
    matches.push({
      pagePath,
      alias,
      fullMatch: match[0],
      headingRef,
      blockRef,
    });
  }

  if (matches.length === 0) {
    // No wikilinks, render normally
    return React.createElement(ReactMarkdown, {}, markdown);
  }

  // Split markdown by wikilinks and create elements
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const matchIndex = markdown.indexOf(match.fullMatch, lastIndex);
    if (matchIndex > lastIndex) {
      const beforeText = markdown.slice(lastIndex, matchIndex);
      if (beforeText) {
        elements.push(beforeText);
      }
    }

    // Build display text
    let displayText = match.alias || match.pagePath;
    if (match.headingRef) {
      displayText = match.alias || `${match.pagePath} > ${match.headingRef}`;
    } else if (match.blockRef) {
      displayText = match.alias || `${match.pagePath} > ^${match.blockRef}`;
    }

    // Add the wikilink as an interactive element
    elements.push(
      React.createElement(
        'a',
        {
          className: 'cm-wikilink',
          href: '#',
          'data-page-path': match.pagePath,
          'data-heading-ref': match.headingRef || '',
          'data-block-ref': match.blockRef || '',
          onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const isNavigation = (window.navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey);
            if (isNavigation) {
              onWikilinkClick(match.pagePath, match.alias, match.headingRef, match.blockRef);
            }
          }
        },
        displayText
      )
    );

    lastIndex = matchIndex + match.fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    elements.push(markdown.slice(lastIndex));
  }

  return React.createElement('span', {}, ...elements);
}

/**
 * Widget for rendering a single markdown block
 */
export class RenderedMarkdownBlockWidget extends WidgetType {
  constructor(
    public readonly block: SplitBlock,
    public readonly frontmatterLabel: string,
    public readonly setFocusedBlock: any,
    public readonly setActiveBlock: any,
    public readonly renderPlugins?: { remark?: any[]; rehype?: any[] },
    public readonly isFocused: boolean = false
  ) {
    super();
  }

  eq(other: RenderedMarkdownBlockWidget): boolean {
    return (
      other.block.markdown === this.block.markdown &&
      other.block.type === this.block.type &&
      other.frontmatterLabel === this.frontmatterLabel &&
      other.isFocused === this.isFocused
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = `cm-live-rendered-block cm-live-rendered-${this.block.type}`;
    if (this.isFocused) {
      container.classList.add('cm-live-focused-block');
    }

    // Add block ID as data attribute for block reference targeting
    if (this.block.blockId) {
      container.setAttribute('data-block-id', this.block.blockId);
    }

    // Single click handler - set focused block (cursor position without edit mode)
    container.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      // Don't preventDefault - allow text selection
      // Don't stopPropagation - let click handler handle double-click detection

      const position = cursorPositionFromClick(view, event, this.block.from, this.block.to);
      view.dispatch({
        selection: { anchor: position },
        effects: this.setFocusedBlock.of({
          from: this.block.from,
          to: this.block.to,
          sourceTo: this.block.sourceTo,
        }),
        scrollIntoView: true,
      });
      requestLivePreviewMeasure(view);
      view.focus();
    }, { capture: true });

    const root = createRoot(container);
    container.__mdockLiveRoot = root;
    root.render(this.renderContent());
    return container;
  }

  destroy(dom: HTMLElement): void {
    dom.__mdockLiveRoot?.unmount();
  }

  ignoreEvent(): boolean {
    return false;
  }

  renderContent(): React.ReactElement {
    const { block, frontmatterLabel, renderPlugins } = this;

    if (block.type === 'frontmatter') {
      const { frontmatter } = splitFrontmatter(`${block.markdown}\n`);
      return React.createElement('section', { className: 'markdown-frontmatter', 'aria-label': frontmatterLabel },
        React.createElement('h4', null, frontmatterLabel),
        React.createElement('pre', null, frontmatter)
      );
    }

    // Process wikilinks in the markdown content
    return processWikilinks(block.markdown, (pagePath, alias) => {
      // Click handler for wikilinks - navigation will be handled by the widget
    });
  }
}

/**
 * Widget for rendering the entire document (fallback when no active block)
 */
export class RenderedMarkdownDocumentWidget extends WidgetType {
  constructor(
    public readonly content: string,
    public readonly blocks: SplitBlock[],
    public readonly frontmatterLabel: string,
    public readonly setFocusedBlock: any,
    public readonly renderPlugins?: { remark?: any[]; rehype?: any[] }
  ) {
    super();
  }

  eq(other: RenderedMarkdownDocumentWidget): boolean {
    return (
      other.content === this.content &&
      other.frontmatterLabel === this.frontmatterLabel
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-live-rendered-block cm-live-full-document';

    container.addEventListener('mousedown', (event) => {
      const block = this.blockFromEventTarget(container, event.target);
      if (!block) return;

      // Don't preventDefault - allow text selection
      // Don't stopPropagation - let click handler handle double-click detection

      const position = cursorPositionFromClick(view, event, block.from, block.to);
      view.dispatch({
        selection: { anchor: position },
        effects: this.setFocusedBlock.of({
          from: block.from,
          to: block.to,
          sourceTo: block.sourceTo,
        }),
        scrollIntoView: true,
      });
      requestLivePreviewMeasure(view);
      view.focus();
    }, { capture: true });

    const root = createRoot(container);
    container.__mdockLiveRoot = root;
    root.render(this.renderContent());
    return container;
  }

  destroy(dom: HTMLElement): void {
    dom.__mdockLiveRoot?.unmount();
  }

  ignoreEvent(): boolean {
    return false;
  }

  blockFromEventTarget(container: HTMLElement, target: EventTarget | null): SplitBlock | null {
    const preview = container.querySelector('.markdown-preview');
    if (!preview || !(target instanceof Element)) {
      return this.blocks[0] ?? null;
    }

    const child = target.closest('.markdown-preview > *');
    if (!child) {
      return this.blocks[0] ?? null;
    }

    const index = Array.from(preview.children).indexOf(child);
    return this.blocks[index] ?? null;
  }

  renderContent(): React.ReactElement {
    const { frontmatter, body } = splitFrontmatter(this.content);
    const { remark: remarkPlugins, rehype: rehypePlugins } = this.renderPlugins ?? {};

    return React.createElement('article', { className: 'markdown-preview cm-live-rendered-preview' },
      frontmatter
        ? React.createElement('section', { className: 'markdown-frontmatter', 'aria-label': this.frontmatterLabel },
          React.createElement('h4', null, this.frontmatterLabel),
          React.createElement('pre', null, frontmatter)
        )
        : null,
      React.createElement(ReactMarkdown, {
        remarkPlugins,
        rehypePlugins,
      }, body)
    );
  }
}

/**
 * Request a measure from the editor view (for layout updates)
 */
export function requestLivePreviewMeasure(view: EditorView): void {
  const schedule = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame
    : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
  schedule(() => {
    if (view.destroyed) return;
    view.requestMeasure();
  });
}

/**
 * Split frontmatter from content
 */
export function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  if (!content.startsWith('---\n')) {
    return { frontmatter: '', body: content };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return { frontmatter: '', body: content };
  }
  const frontmatter = content.slice(4, end).trim();
  const bodyStart = content.indexOf('\n', end + 4);
  return {
    frontmatter,
    body: bodyStart === -1 ? '' : content.slice(bodyStart + 1)
  };
}