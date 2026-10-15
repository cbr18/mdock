/**
 * Block splitter for Markdown live preview
 * Extracted from livePreviewExtension.js
 */

import type { SplitBlock, BlockType } from '../types';

/**
 * Generate a short unique ID for block references
 * Format: block-{6-char-hash}
 */
function generateBlockId(): string {
  const hash = Math.random().toString(36).substring(2, 8);
  return `block-${hash}`;
}

/**
 * Check if a line is blank (empty or whitespace only)
 */
export function isBlank(line: string): boolean {
  return /^\s*$/.test(line);
}

/**
 * Check if a line starts a fenced code block
 */
export function isFenceStart(line: string): boolean {
  return /^\s{0,3}(```|~~~)/.test(line);
}

/**
 * Check if a line is an ATX heading
 */
export function isAtxHeading(line: string): boolean {
  return /^\s{0,3}#{1,6}(?:\s+|$)/.test(line);
}

/**
 * Check if a line is a setext underline
 */
export function isSetextUnderline(line: string): boolean {
  return /^\s{0,3}(=+|-+)\s*$/.test(line);
}

/**
 * Check if a line is a thematic break
 */
export function isThematicBreak(line: string): boolean {
  return /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
}

/**
 * Check if a line is a blockquote
 */
export function isBlockquoteLine(line: string): boolean {
  return /^\s{0,3}>/.test(line);
}

/**
 * Check if a line starts a list item
 */
export function isListLine(line: string): boolean {
  return /^\s{0,3}(?:[-+*]|\d{1,9}[.)])\s+/.test(line);
}

/**
 * Check if a line is a list continuation
 */
export function isListContinuation(line: string): boolean {
  return isListLine(line) || /^\s{2,}\S/.test(line);
}

/**
 * Check if lines at index form a table start
 */
export function isTableStart(lines: string[], index: number): boolean {
  return (
    index + 1 < lines.length &&
    isTableRow(lines[index]) &&
    isTableDelimiter(lines[index + 1])
  );
}

/**
 * Check if a line is a table row
 */
export function isTableRow(line: string): boolean {
  return /^\s*\|?.+\|.+\|?\s*$/.test(line);
}

/**
 * Check if a line is a table delimiter
 */
export function isTableDelimiter(line: string): boolean {
  return /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line);
}

/**
 * Create a block object from line range
 */
export function createBlock(
  type: BlockType,
  lines: string[],
  starts: number[],
  startLine: number,
  endLine: number,
  existingBlockId?: string
): SplitBlock {
  const from = starts[startLine];
  const to = starts[endLine] + lines[endLine].length;
  const markdown = lines.slice(startLine, endLine + 1).join('\n');
  return { type, from, to, sourceTo: to, markdown, blockId: existingBlockId ?? generateBlockId() };
}

/**
 * Absorb trailing separators into block ranges
 */
export function absorbSeparators(blocks: SplitBlock[], contentLength: number): SplitBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    to: blocks[index + 1]?.from ?? contentLength,
  }));
}

/**
 * Trim trailing blank lines from a line range
 */
export function trimTrailingBlank(lines: string[], start: number, end: number): number {
  let nextEnd = end;
  while (nextEnd > start && isBlank(lines[nextEnd])) {
    nextEnd -= 1;
  }
  return nextEnd;
}

/**
 * Check if a line starts a new block
 */
export function startsNewBlock(lines: string[], index: number): boolean {
  return (
    isFenceStart(lines[index]) ||
    isTableStart(lines, index) ||
    isListLine(lines[index]) ||
    isBlockquoteLine(lines[index]) ||
    isAtxHeading(lines[index]) ||
    isThematicBreak(lines[index])
  );
}

/**
 * Split markdown content into blocks
 * This is the main block splitting logic
 */
export function splitBlocks(content: string): SplitBlock[] {
  const lines = content.split('\n');
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }

  const blocks: SplitBlock[] = [];
  let index = 0;

  // Handle frontmatter
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

    // Fenced code block
    if (isFenceStart(lines[index])) {
      index += 1;
      while (index < lines.length && !isFenceStart(lines[index])) {
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(createBlock('code', lines, starts, start, index - 1));
      continue;
    }

    // Table
    if (isTableStart(lines, index)) {
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        index += 1;
      }
      blocks.push(createBlock('table', lines, starts, start, index - 1));
      continue;
    }

    // List
    if (isListLine(lines[index])) {
      index += 1;
      while (index < lines.length && (isListContinuation(lines[index]) || isBlank(lines[index]))) {
        index += 1;
      }
      blocks.push(createBlock('list', lines, starts, start, trimTrailingBlank(lines, start, index - 1)));
      continue;
    }

    // Blockquote
    if (isBlockquoteLine(lines[index])) {
      index += 1;
      while (index < lines.length && (isBlockquoteLine(lines[index]) || isBlank(lines[index]))) {
        index += 1;
      }
      blocks.push(createBlock('blockquote', lines, starts, start, trimTrailingBlank(lines, start, index - 1)));
      continue;
    }

    // ATX heading
    if (isAtxHeading(lines[index])) {
      blocks.push(createBlock('heading', lines, starts, start, start));
      index += 1;
      continue;
    }

    // Setext heading
    if (index + 1 < lines.length && isSetextUnderline(lines[index + 1])) {
      blocks.push(createBlock('heading', lines, starts, start, index + 1));
      index += 2;
      continue;
    }

    // Thematic break
    if (isThematicBreak(lines[index])) {
      blocks.push(createBlock('thematicBreak', lines, starts, start, start));
      index += 1;
      continue;
    }

    // Paragraph (default)
    index += 1;
    while (index < lines.length && !isBlank(lines[index]) && !startsNewBlock(lines, index)) {
      index += 1;
    }
    blocks.push(createBlock('paragraph', lines, starts, start, index - 1));
  }

  return absorbSeparators(blocks, content.length);
}

/**
 * Debounced cache for splitBlocks
 */
let splitBlocksCache: { content: string; blocks: SplitBlock[] | null; timestamp: number } = {
  content: '',
  blocks: null,
  timestamp: 0,
};

const SPLIT_BLOCKS_DEBOUNCE_MS = 50;

/**
 * Get split blocks with caching
 */
export function getSplitBlocks(content: string): SplitBlock[] {
  const now = Date.now();
  if (splitBlocksCache.content === content && splitBlocksCache.blocks) {
    return splitBlocksCache.blocks;
  }
  splitBlocksCache = { content, blocks: splitBlocks(content), timestamp: now };
  return splitBlocksCache.blocks;
}

/**
 * Find block at a given position
 */
export function blockAtPosition(state: { doc: { toString: () => string } }, position: number): SplitBlock | null {
  const content = state.doc.toString();
  const blocks = getSplitBlocks(content);
  return blocks.find((block) => position >= block.from && position < block.to) ?? blocks[blocks.length - 1] ?? null;
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