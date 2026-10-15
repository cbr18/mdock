/**
 * Rehype plugin for rendering callouts to HTML
 * Transforms callout AST nodes to proper HTML with icons, fold buttons, etc.
 */

import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

/**
 * Lucide icon paths for callout types
 */
const CALLOUT_ICONS: Record<string, string> = {
  note: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  tip: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"/><path d="M12 16v6"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M2 12h6"/><path d="M16 12h6"/><path d="M4.93 19.07l4.24-4.24"/><path d="M14.83 9.17l4.24-4.24"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  danger: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 15h6"/></svg>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
  question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
};

/**
 * Fold icon (chevron down)
 */
const FOLD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

/**
 * Rehype plugin to render callout nodes
 */
export function rehypeCallout() {
  return (tree: any) => {
    visit(tree, 'element', (node: Element, index: number, parent: any) => {
      if (!node.properties || node.properties['data-callout-type'] === undefined) return;

      const calloutType = node.properties['data-callout-type'];
      const isFolded = node.properties.className?.includes('callout-folded') ?? false;
      const customTitle = node.properties['data-callout-title'];

      // Generate unique IDs for ARIA
      const calloutId = `callout-${Math.random().toString(36).slice(2, 9)}`;
      const contentId = `${calloutId}-content`;
      const titleId = `${calloutId}-title`;

      // Get icon
      const iconSvg = CALLOUT_ICONS[calloutType] || CALLOUT_ICONS.note;

      // Build header
      const header: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-header'] },
        children: [
          // Icon
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['callout-icon'], 'aria-hidden': 'true' },
            children: [{ type: 'raw', value: iconSvg }]
          },
          // Title area
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['callout-title-area'] },
            children: [
              // Title
              {
                type: 'element',
                tagName: 'h4',
                properties: { 
                  className: ['callout-title'], 
                  id: titleId 
                },
                children: [
                  { type: 'text', value: customTitle || calloutType.charAt(0).toUpperCase() + calloutType.slice(1) }
                ]
              },
              // Fold button
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  className: ['callout-fold-btn'],
                  type: 'button',
                  'aria-expanded': !isFolded,
                  'aria-controls': contentId,
                  'aria-label': isFolded ? 'Expand callout' : 'Collapse callout',
                  id: `${calloutId}-fold-btn`
                },
                children: [
                  {
                    type: 'element',
                    tagName: 'span',
                    properties: { className: ['fold-icon'], 'aria-hidden': 'true' },
                    children: [{ type: 'raw', value: FOLD_ICON }]
                  }
                ]
              }
            ]
          }
        ]
      };

      // Wrap existing children in content div
      const contentDiv: Element = {
        type: 'element',
        tagName: 'div',
        properties: { 
          className: ['callout-content'],
          id: contentId,
          role: 'region'
        },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['markdown-preview'] },
            children: node.children
          }
        ]
      };

      // Replace node with full structure
      Object.assign(node, {
        tagName: 'div',
        properties: {
          ...node.properties,
          className: ['callout', `callout-${calloutType}`].concat(node.properties.className || []).filter(Boolean),
          role: 'region',
          'aria-labelledby': titleId
        },
        children: [header, contentDiv]
      });

      // Add folded class if needed
      if (isFolded) {
        node.properties.className.push('callout-folded');
      }
    });
  };
}

export default rehypeCallout;