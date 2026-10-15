/**
 * Remark plugin for parsing footnotes
 * Uses remark-footnotes under the hood
 * Supports both reference footnotes [^1] and inline footnotes ^[text]
 */

import footnotes from 'remark-footnotes';

/**
 * Remark plugin for footnotes parsing
 * This wraps remark-footnotes which handles:
 * - Footnote references: [^1], [^note]
 * - Footnote definitions: [^1]: Content
 * - Inline footnotes: ^[Content]
 * - Block-level footnotes in definition lists
 */
export function remarkFootnotes() {
  return footnotes;
}

export default remarkFootnotes;