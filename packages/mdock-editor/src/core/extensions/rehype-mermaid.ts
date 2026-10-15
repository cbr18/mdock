/**
 * Rehype plugin for rendering Mermaid diagrams
 * Uses dynamic import to avoid bundle bloat
 * Provides pan/zoom, theme sync, and copy SVG/PNG functionality
 */

import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to render mermaid nodes with client-side rendering
 * Transforms mermaid AST nodes into interactive diagram containers
 */
export function rehypeMermaid() {
  return (tree: any) => {
    visit(tree, 'element', (node: any, index: number, parent: any) => {
      if (!parent || index === undefined) return;

      // Check if this is a mermaid node
      if (node.tagName !== 'div' || !node.properties?.className?.includes('mermaid')) return;

      const mermaidCode = node.properties['data-mermaid-code'];
      if (!mermaidCode) return;

      // Replace with interactive mermaid container
      const containerNode = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['mermaid-container'],
          'data-mermaid-code': mermaidCode,
        },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['mermaid-diagram'],
            },
            children: [
              {
                type: 'text',
                value: mermaidCode,
              },
            ],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['mermaid-toolbar'],
            },
            children: [
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  className: ['mermaid-toolbar-btn', 'mermaid-pan-zoom-btn'],
                  'aria-label': 'Toggle pan/zoom',
                  title: 'Toggle pan/zoom (Shift+Click to pan)',
                },
                children: [{ type: 'text', value: '⤢' }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  className: ['mermaid-toolbar-btn', 'mermaid-copy-svg-btn'],
                  'aria-label': 'Copy as SVG',
                  title: 'Copy as SVG',
                },
                children: [{ type: 'text', value: '⬇ SVG' }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  className: ['mermaid-toolbar-btn', 'mermaid-copy-png-btn'],
                  'aria-label': 'Copy as PNG',
                  title: 'Copy as PNG',
                },
                children: [{ type: 'text', value: '⬇ PNG' }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  className: ['mermaid-toolbar-btn', 'mermaid-fullscreen-btn'],
                  'aria-label': 'Fullscreen',
                  title: 'Open in fullscreen',
                },
                children: [{ type: 'text', value: '⛶' }],
              },
            ],
          },
        ],
      };

      parent.children[index] = containerNode;
    });
  };
}

export default rehypeMermaid;