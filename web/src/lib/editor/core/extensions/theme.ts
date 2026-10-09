/**
 * Editor theme extension for CodeMirror 6
 * Extracted from web/src/styles.css CM6 live preview styles
 */

import { EditorView } from '@codemirror/view';

export interface EditorThemeConfig {
  /** CSS custom properties for theming */
  cssVariables?: Record<string, string>;
  /** Base theme: 'light' | 'dark' */
  baseTheme?: 'light' | 'dark';
}

/**
 * Create editor theme extension with CSS variables
 */
export function createEditorTheme(config: EditorThemeConfig = {}): Extension {
  const { cssVariables = {}, baseTheme = 'dark' } = config;

  // Build CSS variable declarations
  const cssVars = Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

  const theme = EditorView.theme({
    '&.cm-live-preview': {
      // Base styles for live preview mode
    },
    '&.cm-live-preview .cm-content': {
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: 'none',
      minHeight: '100%',
      margin: 0,
      padding: '34px 46px',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 'var(--markdown-font-size, 16px)',
      lineHeight: '1.62',
    },
    '&.cm-live-preview .cm-line': {
      height: 0,
      minHeight: 0,
      padding: 0,
      overflow: 'hidden',
      lineHeight: 0,
    },
    '&.cm-live-preview .cm-line.cm-live-active-source-line': {
      boxSizing: 'border-box',
      height: 'auto',
      minHeight: 0,
      overflow: 'visible',
      padding: '2px 10px',
      borderRadius: 0,
      background: 'color-mix(in srgb, var(--surface-2) 82%, transparent)',
      boxShadow: 'inset 1px 0 0 var(--border), inset -1px 0 0 var(--border)',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 'var(--markdown-font-size, 16px)',
      lineHeight: '1.62',
    },
    '&.cm-live-preview .cm-line.cm-live-active-source-line-first': {
      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
      boxShadow: 'inset 1px 0 0 var(--border), inset -1px 0 0 var(--border), inset 0 1px 0 var(--border)',
    },
    '&.cm-live-preview .cm-line.cm-live-active-source-line-last': {
      borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
      boxShadow: 'inset 1px 0 0 var(--border), inset -1px 0 0 var(--border), inset 0 -1px 0 var(--border)',
    },
    '&.cm-live-preview .cm-line.cm-live-active-source-line-first.cm-live-active-source-line-last': {
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'inset 0 0 0 1px var(--border)',
    },
    '&.cm-live-preview .cm-gutters': {
      display: 'none',
    },
    '&.cm-live-preview .cm-live-marker': {
      color: 'var(--text-muted)',
      opacity: 0.38,
    },
    '&.cm-live-preview .cm-live-heading-line': {
      color: 'var(--text)',
      fontWeight: 700,
      lineHeight: '1.25',
    },
    '&.cm-live-preview .cm-live-heading-1': { fontSize: '28px' },
    '&.cm-live-preview .cm-live-heading-2': { fontSize: '23px' },
    '&.cm-live-preview .cm-live-heading-3': { fontSize: '19px' },
    '&.cm-live-preview .cm-live-heading-4, &.cm-live-preview .cm-live-heading-5, &.cm-live-preview .cm-live-heading-6': {
      fontSize: '16px',
    },
    '&.cm-live-preview .cm-live-strong': { fontWeight: 700 },
    '&.cm-live-preview .cm-live-emphasis': { fontStyle: 'italic' },
    '&.cm-live-preview .cm-live-strike': { textDecoration: 'line-through' },
    '&.cm-live-preview .cm-live-highlight': {
      borderRadius: '4px',
      background: 'color-mix(in srgb, var(--warning) 28%, transparent)',
    },
    '&.cm-live-preview .cm-live-inline-code': {
      padding: '1px 4px',
      borderRadius: '5px',
      background: 'var(--surface-2)',
      color: 'var(--text-soft)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    },
    '&.cm-live-preview .cm-live-link, &.cm-live-preview .cm-live-wikilink': {
      color: 'var(--accent)',
      textDecoration: 'underline',
      textDecorationColor: 'color-mix(in srgb, var(--accent) 45%, transparent)',
      textUnderlineOffset: '3px',
    },
    '&.cm-live-preview .cm-live-list-line': { paddingLeft: '18px' },
    '&.cm-live-preview .cm-live-bullet': {
      display: 'inline-block',
      width: '18px',
      marginLeft: '-18px',
      color: 'var(--text-muted)',
      textAlign: 'center',
    },
    '&.cm-live-preview .cm-live-task-line': { paddingLeft: '24px' },
    '&.cm-live-preview .cm-live-task-checkbox': {
      width: '14px',
      height: '14px',
      margin: '0 10px 0 -24px',
      verticalAlign: '-2px',
      accentColor: 'var(--accent)',
    },
    '&.cm-live-preview .cm-live-list-number': {
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums',
    },
    '&.cm-live-preview .cm-live-quote-line': {
      borderLeft: '3px solid var(--accent)',
      paddingLeft: '14px',
      color: 'var(--text-muted)',
    },
    '&.cm-live-preview .cm-live-codeblock-line': {
      paddingLeft: '14px',
      paddingRight: '14px',
      background: 'var(--surface-2)',
      color: 'var(--text-soft)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 'var(--markdown-code-font-size, 14px)',
      lineHeight: '1.55',
    },
    '&.cm-live-preview .cm-live-code-fence-line': {
      borderTop: '1px solid var(--border)',
    },
    '&.cm-live-preview .cm-live-rendered-block': {
      display: 'block',
      boxSizing: 'border-box',
      minHeight: '24px',
      margin: 0,
      padding: 0,
      cursor: 'text',
      lineHeight: '1.62',
    },
    '&.cm-live-preview .cm-live-rendered-block .markdown-preview': {
      width: '100%',
      maxWidth: 'none',
      margin: 0,
      padding: 0,
      overflow: 'visible',
      border: 0,
      borderRadius: 0,
      background: 'transparent',
      whiteSpace: 'normal',
      fontSize: 'var(--markdown-font-size, 16px)',
      lineHeight: '1.62',
    },
    '&.cm-live-preview .cm-live-rendered-block .markdown-preview > :first-child': {
      marginTop: 0,
    },
    '&.cm-live-preview .cm-live-rendered-block .markdown-preview > :last-child': {
      marginBottom: 0,
    },
    '&.cm-live-preview .cm-live-rendered-frontmatter .markdown-frontmatter': {
      margin: 0,
    },
    '&.cm-live-preview .cm-live-rendered-block .markdown-preview > pre, &.cm-live-preview .cm-live-rendered-block .markdown-preview code': {
      fontSize: 'var(--markdown-code-font-size, 14px)',
    },
    '&.cm-live-preview .cm-live-rendered-thematicBreak .markdown-preview hr': {
      border: 0,
      borderTop: '1px solid var(--border-strong)',
    },
    '&.cm-live-preview .cm-live-code-language': {
      display: 'inline-block',
      marginLeft: '8px',
      color: 'var(--text-muted)',
      fontSize: '11px',
      textTransform: 'uppercase',
    },
    '&.cm-live-preview .cm-live-frontmatter-line': {
      paddingLeft: '14px',
      borderLeft: '3px solid var(--border-strong)',
      background: 'color-mix(in srgb, var(--surface-2) 72%, transparent)',
      color: 'var(--text-muted)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 'var(--markdown-code-font-size, 14px)',
      lineHeight: '1.55',
    },
    '&.cm-live-preview .cm-live-frontmatter-line + .cm-live-frontmatter-line': {
      borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
    },
    '&.cm-live-preview .cm-live-horizontal-rule-line': {
      padding: '10px 0',
    },
    '&.cm-live-preview .cm-live-horizontal-rule': {
      display: 'block',
      width: '100%',
      height: '1px',
      background: 'var(--border-strong)',
    },
    '&.cm-live-preview .cm-live-table-line': {
      padding: '5px 10px',
      borderLeft: '1px solid var(--border)',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg-subtle)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 'var(--markdown-code-font-size, 14px)',
      lineHeight: '1.55',
    },
    '&.cm-live-preview .cm-live-table-line:first-child': {
      borderTop: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
    },
    '&.cm-live-preview .cm-live-image-label, &.cm-live-preview .cm-live-embed-label': {
      display: 'inline-block',
      padding: '1px 6px',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      background: 'var(--surface-2)',
      color: 'var(--text-soft)',
    },
  }, { dark: baseTheme === 'dark' });

  // If custom CSS variables provided, add them as inline style on the editor
  if (Object.keys(cssVariables).length > 0) {
    return [
      theme,
      EditorView.domEventHandlers({
        // This is a workaround - CSS variables should be set on the root element
        // The actual variables are set by the app's ThemeProvider on .theme-root
      }),
    ];
  }

  return theme;
}

/**
 * Default CSS variables expected by the theme
 * These should be set on the root element by the consuming application
 */
export const EXPECTED_CSS_VARIABLES = [
  '--markdown-font-size',
  '--markdown-code-font-size',
  '--radius-sm',
  '--bg',
  '--bg-subtle',
  '--surface',
  '--surface-2',
  '--surface-hover',
  '--border',
  '--border-strong',
  '--text',
  '--text-muted',
  '--text-soft',
  '--accent',
  '--warning',
] as const;

/**
 * Validate that required CSS variables are available
 * Call this in development to warn about missing variables
 */
export function validateCSSVariables(root: HTMLElement = document.documentElement): string[] {
  const computed = getComputedStyle(root);
  const missing: string[] = [];

  for (const variable of EXPECTED_CSS_VARIABLES) {
    const value = computed.getPropertyValue(variable).trim();
    if (!value) {
      missing.push(variable);
    }
  }

  if (missing.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('[mdock-editor] Missing CSS variables:', missing.join(', '));
  }

  return missing;
}