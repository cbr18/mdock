/**
 * Rehype plugin for enhancing footnotes HTML from remark-footnotes
 * The default remark-footnotes output already produces good HTML:
 * - Superscript reference links with data-footnote-ref
 * - Footnote definitions in section with data-footnotes
 * - Backlinks with data-footnote-backref and ↩
 * This plugin adds tooltip content and ensures our CSS classes
 */

import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

// Plugin factory - receives options from unified/ReactMarkdown
export function rehypeFootnotes(options: any = {}) {
  // Return transformer function
  return (tree: Root, file: any) => {
    // Safety check - tree might not be a proper hast Root in all environments
    if (!tree || !tree.children || !Array.isArray(tree.children)) {
      return;
    }
    
    // First pass: collect footnote definition content for tooltips (excluding backlinks)
    const footnoteContent: Record<string, string> = {};

    visit(tree, 'element', (node: Element) => {
      // Footnote definitions have id="user-content-fn-{id}" or similar
      if (node.properties && node.properties.id && typeof node.properties.id === 'string') {
        const idMatch = node.properties.id.match(/fn[-]?(.+)$/);
        if (idMatch) {
          const id = idMatch[1];
          footnoteContent[id] = extractTextContentExcludingBacklinks(node);
        }
      }
      // Also check for data-footnote-id attribute
      if (node.properties && node.properties['data-footnote-id']) {
        const id = node.properties['data-footnote-id'] as string;
        footnoteContent[id] = extractTextContentExcludingBacklinks(node);
      }
    });
    
    // Second pass: enhance footnote references (sup > a) with tooltip content
    visit(tree, 'element', (node: Element) => {
      if (!node.properties) return;
      
      // Skip backlinks FIRST - they have data-footnote-backref (check multiple property name variants)
      const isBacklink = node.properties['data-footnote-backref'] !== undefined ||
                         node.properties.dataFootnoteBackref !== undefined ||
                         node.properties['dataFootnoteBackref'] !== undefined;
      if (isBacklink) return;
      
      // Only target reference links: they are <a> tags inside <sup> with data-footnote-ref
      // or href pointing to #user-content-fn-*
      const isReferenceLink = node.tagName === 'a' && 
        (node.properties['data-footnote-ref'] || 
         (node.properties.href && typeof node.properties.href === 'string' && node.properties.href.match(/fn[-]?/)));
      
      if (!isReferenceLink) return;
      
      // Get identifier from data-footnote-ref or href
      let identifier: string | undefined;
      if (node.properties['data-footnote-ref']) {
        identifier = node.properties['data-footnote-ref'] as string;
      } else if (node.properties.href && typeof node.properties.href === 'string') {
        const match = node.properties.href.match(/fn[-]?(.+)$/);
        if (match) identifier = match[1];
      }
      
      if (!identifier) return;
      
      const tooltipContent = footnoteContent[identifier] || '';
      
      // Add tooltip data attributes
      node.properties['data-footnote-tooltip'] = tooltipContent;
      node.properties.title = tooltipContent;
      node.properties['aria-describedby'] = `fn-tooltip-${identifier}`;
      
      // Ensure our CSS class is present
      const className = node.properties.className;
      const classes = Array.isArray(className) ? className : className ? [className] : [];
      if (!classes.includes('footnote-ref-link')) {
        classes.push('footnote-ref-link');
      }
      node.properties.className = classes;
    });

    // Third pass: ensure footnote definitions and backlinks have our CSS classes
    visit(tree, 'element', (node: Element) => {
      if (!node.properties) return;
      
      // Match footnote definition list items
      const id = node.properties.id as string | undefined;
      if (id && id.match(/^user-content-fn-/)) {
        const className = node.properties.className;
        const classes = Array.isArray(className) ? className : className ? [className] : [];
        if (!classes.includes('footnote-definition')) {
          classes.push('footnote-definition');
        }
        node.properties.className = classes;
        node.properties['data-footnote-id'] = id.replace('user-content-fn-', '');
      }
      
      // Match footnotes section
      if (node.properties['data-footnotes']) {
        const className = node.properties.className;
        const classes = Array.isArray(className) ? className : className ? [className] : [];
        if (!classes.includes('footnotes')) {
          classes.push('footnotes');
        }
        node.properties.className = classes;
      }
      
      // Match footnote backlinks - check multiple property name variants
      const hasBackref = node.properties['data-footnote-backref'] !== undefined ||
                         node.properties.dataFootnoteBackref !== undefined ||
                         node.properties['dataFootnoteBackref'] !== undefined;
      
      if (hasBackref) {
        // Fix the data-footnote-backref value to avoid boolean attribute serialization
        const identifier = node.properties.href?.match(/fnref[-]?(.+)$/)?.[1] || '';
        if (identifier) {
          node.properties['data-footnote-backref'] = identifier;
        }
        
        const className = node.properties.className;
        const classes = Array.isArray(className) ? className : className ? [className] : [];
        // Remove footnote-ref-link if it was incorrectly added
        const filteredClasses = classes.filter(c => c !== 'footnote-ref-link');
        if (!filteredClasses.includes('footnote-backlink')) {
          filteredClasses.push('footnote-backlink');
        }
        node.properties.className = filteredClasses;
      }
      
      // Match footnotes list
      if (node.tagName === 'ol' && node.properties && 
          node.parent && node.parent.properties && node.parent.properties['data-footnotes']) {
        const className = node.properties.className;
        const classes = Array.isArray(className) ? className : className ? [className] : [];
        if (!classes.includes('footnotes-list')) {
          classes.push('footnotes-list');
        }
        node.properties.className = classes;
        node.properties.role = 'list';
        node.properties['aria-label'] = 'Footnotes';
      }
      
      // Match footnotes heading
      if (node.tagName === 'h2' && node.properties && node.properties.id === 'footnote-label') {
        const className = node.properties.className;
        const classes = Array.isArray(className) ? className : className ? [className] : [];
        if (!classes.includes('footnotes-heading')) {
          classes.push('footnotes-heading');
        }
        if (!classes.includes('visually-hidden')) {
          classes.push('visually-hidden');
        }
        node.properties.className = classes;
      }
    });
  };
}

/**
 * Extract text content from a hast node, excluding backlinks
 */
function extractTextContentExcludingBacklinks(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'element' && node.children && Array.isArray(node.children)) {
    // Skip backlink elements
    const hasBackref = node.properties && (
      node.properties['data-footnote-backref'] !== undefined ||
      node.properties.dataFootnoteBackref !== undefined ||
      node.properties['dataFootnoteBackref'] !== undefined
    );
    if (hasBackref) {
      return '';
    }
    return node.children.map(extractTextContentExcludingBacklinks).join(' ');
  }
  return '';
}

export default rehypeFootnotes;