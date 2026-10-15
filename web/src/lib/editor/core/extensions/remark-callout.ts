/**
 * Remark plugin for parsing Obsidian-style callouts
 * Handles: > [!type], > [!type] Title, > [!type]-, > [!type]+
 */

import { visit } from 'unist-util-visit';

/**
 * Callout types supported
 */
const CALLOUT_TYPES = [
  'note', 'info', 'tip', 'warning', 'danger', 'success', 'question'
];

/**
 * Check if a string is a valid callout type
 */
function isCalloutType(str: string): boolean {
  return CALLOUT_TYPES.includes(str.toLowerCase());
}

/**
 * Parse callout marker from blockquote content
 * Returns { type, fold, title } or null
 */
function parseCalloutMarker(text: string): { type: string; fold: 'collapsed' | 'expanded' | 'none'; title: string | null } | null {
  // Match: [!type] or [!type] Title or [!type]- or [!type]+
  const match = text.match(/^\[\s*!(\w+)([+-]?)\s*\]\s*(.*)$/);
  if (!match) return null;

  const type = match[1].toLowerCase();
  const foldMarker = match[2];
  const title = match[3].trim() || null;

  if (!isCalloutType(type)) return null;

  let fold: 'collapsed' | 'expanded' | 'none' = 'none';
  if (foldMarker === '-') fold = 'collapsed';
  else if (foldMarker === '+') fold = 'expanded';

  return { type, fold, title };
}

/**
 * Remark plugin to transform callout blockquotes
 */
export function remarkCallout() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any, index: number, parent: any) => {
      if (!parent || index === undefined) return;

      // Check if first child is a paragraph starting with callout marker
      const firstChild = node.children?.[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const firstTextNode = firstChild.children?.[0];
      if (!firstTextNode || firstTextNode.type !== 'text') return;

      const marker = parseCalloutMarker(firstTextNode.value);
      if (!marker) return;

      // Transform blockquote to callout node
      const calloutNode = {
        type: 'callout',
        data: {
          calloutType: marker.type,
          calloutFold: marker.fold,
          calloutTitle: marker.title,
          hName: 'div',
          hProperties: {
            className: ['callout', `callout-${marker.type}`],
            'data-callout-type': marker.type,
            role: 'region',
            'aria-labelledby': undefined // will be set by rehype
          }
        },
        children: node.children
      };

      // If folded by default, add folded class
      if (marker.fold === 'collapsed') {
        calloutNode.data.hProperties.className.push('callout-folded');
      }

      // Remove the marker from the first paragraph
      if (marker.title) {
        // Replace with title-only paragraph
        firstChild.children = [{
          type: 'text',
          value: marker.title
        }];
      } else {
        // Remove the marker text entirely
        firstChild.children = firstChild.children.slice(1);
        // If paragraph becomes empty, remove it
        if (firstChild.children.length === 0) {
          node.children = node.children.slice(1);
        }
      }

      // Replace blockquote with callout
      parent.children[index] = calloutNode;
    });
  };
}

export default remarkCallout;