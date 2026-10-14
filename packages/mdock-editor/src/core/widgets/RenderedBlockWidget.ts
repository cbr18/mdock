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
 * Process wikilinks in markdown text and convert to React elements with click handlers
 * Handles [[Page]] and [[Page|Alias]] syntax
 */
export interface WikilinkMatch {
  pagePath: string;
  alias: string | null;
  fullMatch: string;
}

export function findWikilinks(text: string): WikilinkMatch[] {
  const matches: Array<{ pagePath: string; alias: string | null; fullMatch: string }> = [];
  const regex = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      pagePath: match[1],
      alias: match[2] || null,
      fullMatch: match[0],
    });
  }
  return matches;
}

/**
 * Process wikilinks in markdown and convert to React elements with click handlers
 * Handles [[Page]] and [[Page|Alias]] syntax
 */
export function processWikilinks(
  markdown: string,
  onWikilinkClick: (pagePath: string, alias: string | null) => void
): React.ReactNode {
  const matches: Array<{ pagePath: string; alias: string | null; fullMatch: string }> = [];
  const regex = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    matches.push({
      pagePath: match[1],
      alias: match[2] || null,
      fullMatch: match[0],
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

    // Add the wikilink as an interactive element
    elements.push(
      React.createElement(
        'a',
        {
          className: 'cm-wikilink',
          href: '#',
          'data-page-path': match.pagePath,
          onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const isNavigation = (window.navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey);
            if (isNavigation) {
              // Navigation will be handled by the widget's click handler
            }
          }
        },
        match.alias || match.pagePath
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
    public readonly setActiveBlock: any,
    public readonly renderPlugins?: { remark?: any[]; rehype?: any[] }
  ) {
    super();
  }

  eq(other: RenderedMarkdownBlockWidget): boolean {
    return (
      other.block.markdown === this.block.markdown &&
      other.block.type === this.block.type &&
      other.frontmatterLabel === this.frontmatterLabel
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = `cm-live-rendered-block cm-live-rendered-${this.block.type}`;

    container.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const position = cursorPositionFromClick(view, event, this.block.from, this.block.to);
      view.dispatch({
        selection: { anchor: position },
        effects: this.setActiveBlock.of(activeBlockRange(this.block)),
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
    public readonly setActiveBlock: any,
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

      event.preventDefault();
      event.stopPropagation();

      const position = cursorPositionFromClick(view, event, block.from, block.to);
      view.dispatch({
        selection: { anchor: position },
        effects: this.setActiveBlock.of(activeBlockRange(block)),
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
    const { remarkPlugins, rehypePlugins } = this.renderPlugins ?? {};

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