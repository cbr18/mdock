/**
 * Autocomplete extension for wikilinks
 * Provides fuzzy search autocomplete triggered by `[[`
 * Supports page references, heading references (#heading), and block references (#^block-id)
 */

import { autocompletion as Autocomplete, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { LivePreviewConfig } from '../types';

/**
 * Heading reference in a page
 */
export interface HeadingRef {
  level: number;
  text: string;
  id: string;
  slug: string;
}

/**
 * Block reference in a page
 */
export interface BlockRef {
  id: string;
  type: string;
  preview: string;
}

/**
 * Extended page result with headings and blocks
 */
export interface PageSearchResult {
  path: string;
  title: string;
  aliases: string;
  preview: string;
  headings?: HeadingRef[];
  blocks?: BlockRef[];
}

/**
 * Configuration for wikilink autocomplete
 */
export interface WikilinkAutocompleteConfig {
  /** Page search API function */
  searchPages: (query: string, limit: number) => Promise<Array<PageSearchResult>>;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Minimum characters after [[ to trigger autocomplete */
  minChars?: number;
  /** Maximum results to show */
  maxResults?: number;
}

/**
 * Parsed wikilink query parts
 */
interface ParsedWikilinkQuery {
  pageQuery: string;
  headingQuery?: string;
  blockQuery?: string;
  hasHeadingRef: boolean;
  hasBlockRef: boolean;
}

/**
 * Parse wikilink query into page/heading/block parts
 */
function parseWikilinkQuery(query: string): ParsedWikilinkQuery {
  // Check for block reference #^block-id
  const blockMatch = query.match(/^(.+?)#\^([\w\-]+)$/);
  if (blockMatch) {
    return {
      pageQuery: blockMatch[1],
      blockQuery: blockMatch[2],
      hasBlockRef: true,
      hasHeadingRef: false
    };
  }

  // Check for heading reference #heading
  const headingMatch = query.match(/^(.+?)#(.+)$/);
  if (headingMatch) {
    return {
      pageQuery: headingMatch[1],
      headingQuery: headingMatch[2],
      hasHeadingRef: true,
      hasBlockRef: false
    };
  }

  // Plain page reference
  return {
    pageQuery: query,
    hasHeadingRef: false,
    hasBlockRef: false
  };
}

/**
 * Create wikilink autocomplete extension
 */
export function wikilinkAutocomplete(config: WikilinkAutocompleteConfig): Extension {
  const {
    searchPages: searchPagesApi,
    debounceMs = 150,
    minChars = 1,
    maxResults = 10,
  } = config;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingQuery: string = '';
  let pendingContext: CompletionContext | null = null;
  let pendingResolve: ((result: CompletionResult) => void) | null = null;
  let pendingReject: ((reason: any) => void) | null = null;

  /**
   * Search pages using the API
   */
  async function searchPagesLocal(query: string, limit: number): Promise<Array<PageSearchResult>> {
    if (!query.trim()) return [];

    try {
      const results = await searchPagesApi(query, limit);
      return results.map(r => ({
        path: r.path,
        title: r.title,
        aliases: r.aliases,
        preview: r.preview,
        headings: r.headings,
        blocks: r.blocks,
      }));
    } catch (error) {
      console.error('Wikilink search failed:', error);
      return [];
    }
  }

  // Extract query from text between [[ and cursor
  function extractWikilinkQuery(docText: string, pos: number): string {
    // Find the last [[ before cursor
    const beforeCursor = docText.slice(0, pos);
    const lastOpen = beforeCursor.lastIndexOf('[[');
    if (lastOpen === -1) return '';
    
    // Check if there's a closing ]] after cursor (meaning we're not in a wikilink)
    const afterCursor = docText.slice(pos);
    const closeBracket = afterCursor.indexOf(']]');
    if (closeBracket !== -1) {
      // We're after a closed wikilink, check for another one
      const nextOpen = afterCursor.indexOf('[[');
      if (nextOpen === -1 || nextOpen > closeBracket) {
        return '';
      }
    }
    
    // Extract text between [[ and cursor
    return beforeCursor.slice(lastOpen + 2);
  }

  return Autocomplete({
    override: [
      {
        match: /\[\[([\w\s\-\.\/\#\^]*)$/,
        detail: 'Wikilink',
        options: async (context: CompletionContext) => {
          // Extract query from the match
          const match = context.matchBefore(/\[\[([\w\s\-\.\/\#\^]*)$/);
          if (!match) return null;

          pendingQuery = match.text.slice(2); // Remove [[
          
          // Return a promise that resolves when debounced search completes
          return new Promise<CompletionResult>((resolve, reject) => {
            pendingContext = context;
            pendingResolve = resolve;
            pendingReject = reject;

            if (debounceTimer) clearTimeout(debounceTimer);
            
            debounceTimer = setTimeout(async () => {
              try {
                const query = pendingQuery.trim();
                if (query.length < (minChars || 1)) {
                  resolve({ from: context.pos - pendingQuery.length - 2, options: [] });
                  return;
                }

                // Parse the query for heading/block references
                const parsed = parseWikilinkQuery(pendingQuery);
                
                if (parsed.hasHeadingRef || parsed.hasBlockRef) {
                  // We have a page selected, now search for headings/blocks within it
                  const pageResults = await searchPagesLocal(parsed.pageQuery, 1);
                  const page = pageResults[0];
                  
                  if (page) {
                    const completions: Completion[] = [];
                    
                    if (parsed.hasHeadingRef && page.headings) {
                      // Filter headings by query
                      const headingResults = page.headings
                        .filter(h => h.text.toLowerCase().includes(parsed.headingQuery!.toLowerCase()))
                        .slice(0, maxResults || 10)
                        .map(h => ({
                          label: `${'  '.repeat(h.level - 1)}# ${h.text}`,
                          detail: `Heading (H${h.level})`,
                          info: `ID: ${h.id}`,
                          apply: `[[${page.path}#${h.slug}]]`,
                          type: 'wikilink-heading',
                          boost: 90,
                        }));
                      completions.push(...headingResults);
                    }
                    
                    if (parsed.hasBlockRef && page.blocks) {
                      // Filter blocks by query
                      const blockResults = page.blocks
                        .filter(b => b.id.includes(parsed.blockQuery!) || b.preview.toLowerCase().includes(parsed.blockQuery!.toLowerCase()))
                        .slice(0, maxResults || 10)
                        .map(b => ({
                          label: `^ ${b.id}`,
                          detail: `Block (${b.type})`,
                          info: b.preview.slice(0, 100),
                          apply: `[[${page.path}#^${b.id}]]`,
                          type: 'wikilink-block',
                          boost: 80,
                        }));
                      completions.push(...blockResults);
                    }
                    
                    resolve({
                      from: context.pos - pendingQuery.length - 2,
                      to: context.pos,
                      options: completions,
                      validFor: /^[\w\s\-\.\/\#\^]*$/,
                      filter: false,
                    });
                    return;
                  }
                }

                // Regular page search
                const results = await searchPagesLocal(pendingQuery, maxResults || 10);
                
                const completions = results.map(page => ({
                  label: page.title,
                  detail: page.aliases || page.path,
                  info: page.preview,
                  apply: `[[${page.path}]]`,
                  type: 'wikilink',
                  boost: 100,
                })); 

                resolve({
                  from: context.pos - pendingQuery.length - 2,
                  to: context.pos,
                  options: completions,
                  validFor: /^[\w\s\-\.\/\#\^]*$/,
                  filter: false,
                });
              } catch (error) {
                reject(error);
              }
            }, debounceMs);
          });
        }
      },
    ],
  });
}

// Re-export types
export type { PageSearchResult, HeadingRef, BlockRef, ParsedWikilinkQuery };