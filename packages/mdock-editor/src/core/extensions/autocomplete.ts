/**
 * Autocomplete extension for wikilinks
 * Provides fuzzy search autocomplete triggered by `[[`
 */

import { Autocomplete, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import type { LivePreviewConfig } from '../types';
import { SearchPageIndex, PageIndex } from '../../api/search';

/**
 * Configuration for wikilink autocomplete
 */
export interface WikilinkAutocompleteConfig {
  /** Page search API function */
  searchPages: (query: string, limit: number) => Promise<Array<{
    path: string;
    title: string;
    aliases: string;
    preview: string;
  }>>;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Minimum characters after [[ to trigger autocomplete */
  minChars?: number;
  /** Maximum results to show */
  maxResults?: number;
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
   * Execute the search API call
   */
  async function executeSearch(query: string, limit: number): Promise<Array<{
    path: string;
    title: string;
    aliases: string;
    preview: string;
  }>> {
    if (!query.trim()) return [];

    try {
      const results = await searchPagesApi(query, limit);
      return results.map(r => ({
        path: r.path,
        title: r.title,
        aliases: r.aliases,
        preview: r.preview,
      }));
    } catch (error) {
      console.error('Wikilink search failed:', error);
      return [];
    }
  }

  /**
   * Trigger search with debounce
   */
  function triggerSearch(context: CompletionContext, query: string): Promise<CompletionResult> {
    return new Promise((resolve, reject) => {
      // Clear existing debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Store context and resolvers
      pendingContext = context;
      pendingResolve = resolve;
      pendingReject = reject;

      // Debounce the search
      debounceTimer = setTimeout(async () => {
        try {
          const results = await executeSearch(context.state.doc.toString(), maxResults);
          
          const completions: Completion[] = results.map(page => ({
            label: page.title,
            detail: page.aliases || page.path,
            info: page.preview,
            apply: `[[${page.path}]]`,
            type: 'wikilink',
            boost: 100,
          }));

          const result: CompletionResult = {
            from: pendingContext.pos - pendingQuery.length - 2, // -2 for [[
            to: pendingContext.pos,
            options: completions,
            validFor: /^[\w\s\-\.\/]*$/,
            filter: false,
          };

          if (pendingResolve) {
            pendingResolve(result);
          }
        } catch (error) {
          if (pendingReject) {
            pendingReject(error);
          }
        }
      }, debounceMs);
    });
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
        match: /\[\[([\w\s\-\.\/]*)$/,
        detail: 'Wikilink',
        options: async (context: CompletionContext) => {
          // Extract query from the match
          const match = context.matchBefore(/\[\[([\w\s\-\.\/]*)$/);
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

                const results = await executeSearch(pendingQuery, maxResults || 10);
                
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
                  validFor: /^[\w\s\-\.\/]*$/,
                  filter: false
                });
              } catch (error) {
                reject(error);
              }
            }, debounceMs);
          });
        }
      }
    ]
  });
}

// Re-export Completion types
export type { Completion, CompletionContext, CompletionResult };