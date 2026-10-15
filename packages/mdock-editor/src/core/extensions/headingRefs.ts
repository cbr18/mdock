/**
 * Heading reference tracking and wikilink updating
 * Handles automatic wikilink updates when headings are renamed
 */

import type { SplitBlock } from '../types';
import { splitBlocks } from '../splitters/blockSplitter';

/**
 * Heading information extracted from content
 */
export interface HeadingInfo {
  /** Heading text */
  text: string;
  /** Generated slug from text */
  slug: string;
  /** Heading level (1-6) */
  level: number;
  /** Block position in content */
  from: number;
  to: number;
}

/**
 * Result of heading change detection
 */
export interface HeadingChangeResult {
  /** Array of changes: { oldSlug, newSlug, oldText, newText } */
  changes: Array<{
    oldSlug: string;
    newSlug: string;
    oldText: string;
    newText: string;
  }>;
  /** All current headings with their slugs */
  currentHeadings: HeadingInfo[];
}

/**
 * Slugify a heading text to generate a URL-friendly anchor
 * Compatible with GitHub/Obsidian heading anchor generation
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // Remove special characters except spaces, hyphens, underscores
    .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
    // Replace spaces and multiple hyphens/underscores with single hyphen
    .replace(/[\s\-_]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .slice(0, 100);
}

/**
 * Extract all headings from content with their slugs
 */
export function extractHeadings(content: string): HeadingInfo[] {
  const blocks = splitBlocks(content);
  const headings: HeadingInfo[] = [];
  const slugCounts = new Map<string, number>();

  for (const block of blocks) {
    if (block.type !== 'heading') continue;

    // Extract heading text from markdown
    const headingMatch = block.markdown.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();
    const baseSlug = slugifyHeading(text);

    // Handle duplicate slugs by appending -1, -2, etc.
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    headings.push({
      text,
      slug,
      level,
      from: block.from,
      to: block.to,
    });
  }

  return headings;
}

/**
 * Compare two sets of headings and detect changes
 * Returns array of changes: { oldSlug, newSlug, oldText, newText }
 */
export function detectHeadingChanges(
  oldContent: string,
  newContent: string
): HeadingChangeResult {
  const oldHeadings = extractHeadings(oldContent);
  const newHeadings = extractHeadings(newContent);

  const changes: Array<{
    oldSlug: string;
    newSlug: string;
    oldText: string;
    newText: string;
  }> = [];

  // Match headings by position (from/to) first, then by text similarity
  // This handles the case where a heading is edited in place
  for (const oldHeading of oldHeadings) {
    // Find matching new heading by position overlap
    const matchingNew = newHeadings.find(
      (nh) => rangesOverlap(oldHeading.from, oldHeading.to, nh.from, nh.to)
    );

    if (matchingNew) {
      const oldSlug = generateHeadingSlug(oldHeading);
      const newSlug = generateHeadingSlug(matchingNew);

      if (oldSlug !== newSlug) {
        changes.push({
          oldSlug,
          newSlug,
          oldText: oldHeading.text,
          newText: matchingNew.text,
        });
      }
    }
  }

  // Also check for completely new headings (no position match)
  // that might have been inserted
  for (const newHeading of newHeadings) {
    const hasOldMatch = oldHeadings.some(
      (oh) => rangesOverlap(oh.from, oh.to, newHeading.from, newHeading.to)
    );
    // If no old match at this position, it's a new heading - no change needed
  }

  return {
    changes,
    currentHeadings: newHeadings,
  };
}

/**
 * Generate the full slug for a heading (including duplicate handling)
 * We need to recompute the slug the same way extractHeadings does
 */
function generateHeadingSlug(heading: HeadingInfo): string {
  const baseSlug = slugifyHeading(heading.text);
  // We can't easily know the count without full context, so we use the stored slug
  // For heading references, the slug is what was generated
  return heading.slug;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom < bTo && bFrom < aTo;
}

/**
 * Update wikilinks in content that reference changed heading slugs
 * Returns updated content and whether any changes were made
 */
export function updateWikilinksForHeadingChanges(
  content: string,
  changes: Array<{ oldSlug: string; newSlug: string }>
): { content: string; updated: boolean } {
  if (changes.length === 0) {
    return { content, updated: false };
  }

  let updatedContent = content;
  let updated = false;

  for (const change of changes) {
    // Match wikilinks that reference the old slug
    // Pattern: [[page#oldSlug]] or [[page#oldSlug|alias]]
    const escapedOldSlug = escapeRegExp(change.oldSlug);
    const escapedNewSlug = escapeRegExp(change.newSlug);

    // Match [[page#oldSlug]] and [[page#oldSlug|alias]]
    const regex = new RegExp(
      `(\\[\\[[^\\|\\]]+)#${escapedOldSlug}(\\|[^\\]]+)?\\]\\]`,
      'g'
    );

    const newContent = updatedContent.replace(regex, (match, pagePart, aliasPart) => {
      return `${pagePart}#${change.newSlug}${aliasPart || ''}]`;
    });

    if (newContent !== updatedContent) {
      updatedContent = newContent;
      updated = true;
    }
  }

  return { content: updatedContent, updated };
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update wikilinks for heading changes across multiple files
 * For use when a page is renamed or headings are changed
 */
export function updateWikilinksInPage(
  pageContent: string,
  pagePath: string,
  headingChanges: Array<{ oldSlug: string; newSlug: string }>
): { content: string; updated: boolean } {
  // Only update wikilinks that reference THIS page
  // Pattern: [[pagePath#oldSlug]] or [[pagePath#oldSlug|alias]]
  // Also handle [[pagePath|alias#oldSlug]] - but that's not standard

  let updatedContent = pageContent;
  let updated = false;

  for (const change of headingChanges) {
    // Match [[pagePath#oldSlug]] and [[pagePath#oldSlug|alias]]
    // Also match if pagePath has special chars
    const escapedPagePath = escapeRegExp(pagePath);
    const escapedOldSlug = escapeRegExp(change.oldSlug);
    const escapedNewSlug = escapeRegExp(change.newSlug);

    const regex = new RegExp(
      `(\\[\\[${escapedPagePath})#${escapedOldSlug}(\\|[^\\]]+)?\\]\\]`,
      'g'
    );

    const newContent = updatedContent.replace(regex, (match, pagePart, aliasPart) => {
      return `${pagePart}#${change.newSlug}${aliasPart || ''}]`;
    });

    if (newContent !== updatedContent) {
      updatedContent = newContent;
      updated = true;
    }
  }

  return { content: updatedContent, updated };
}

/**
 * Compute the difference between two strings as a series of changes
 * Returns array of { from, to, insert } for applying to a transaction
 */
export function computeChanges(oldContent: string, newContent: string): Array<{ from: number; to: number; insert: string }> {
  // Simple diff algorithm - find the first difference and last difference
  let prefixLen = 0;
  const minLen = Math.min(oldContent.length, newContent.length);
  
  while (prefixLen < minLen && oldContent[prefixLen] === newContent[prefixLen]) {
    prefixLen++;
  }
  
  if (prefixLen === oldContent.length && prefixLen === newContent.length) {
    return []; // No changes
  }
  
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    oldContent[oldContent.length - 1 - suffixLen] === newContent[newContent.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  
  const from = prefixLen;
  const to = oldContent.length - suffixLen;
  const insert = newContent.slice(prefixLen, newContent.length - suffixLen);
  
  return [{ from, to, insert }];
}

/**
 * Full heading change detection and wikilink update for a page
 * Returns updated content if any changes were made
 */
export function processHeadingRename(
  oldContent: string,
  newContent: string,
  pagePath: string
): { content: string; updated: boolean; changes: HeadingChangeResult['changes'] } {
  const result = detectHeadingChanges(oldContent, newContent);

  if (result.changes.length === 0) {
    return { content: newContent, updated: false, changes: [] };
  }

  // Update wikilinks in the page content itself (for internal links)
  const { content, updated } = updateWikilinksForHeadingChanges(newContent, result.changes);

  return { content, updated, changes: result.changes };
}

/**
 * Re-export for external use
 */
export type { HeadingInfo, HeadingChangeResult };