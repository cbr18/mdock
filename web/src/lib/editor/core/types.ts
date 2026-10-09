/**
 * Core types for @mdock/editor library
 * Framework-agnostic types for CodeMirror 6 based Markdown editor
 */

import type { Extension, EditorView, EditorState, EditorSelection, Transaction } from '@codemirror/state';
import type { WidgetType, Decoration, DecorationSet, KeymapBinding } from '@codemirror/view';

/**
 * Block types identified by the block splitter
 */
export type BlockType =
  | 'frontmatter'
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'table'
  | 'list'
  | 'blockquote'
  | 'thematicBreak'
  | 'callout'
  | 'unknown';

/**
 * A block of markdown content with source positions
 */
export interface SplitBlock {
  type: BlockType;
  from: number;
  to: number;
  sourceTo: number;
  markdown: string;
  lines?: { from: number; to: number }[];
}

/**
 * Block splitter function signature
 */
export type BlockSplitterFn = (content: string) => SplitBlock[];

/**
 * Configuration for live preview extension
 */
export interface LivePreviewConfig {
  /** Label for frontmatter section */
  frontmatterLabel: string;
  /** Optional custom render plugins (remark/rehype) */
  renderPlugins?: {
    remark?: any[];
    rehype?: any[];
  };
  /** Optional custom block splitter */
  blockSplitter?: BlockSplitterFn;
  /** Optional custom widgets */
  widgets?: {
    block?: WidgetType;
    document?: WidgetType;
  };
  /** Optional additional keymap bindings */
  keymap?: KeymapBinding[];
  /** Callback when a block is activated for editing */
  onBlockActivate?: (block: SplitBlock) => void;
}

/**
 * Theme configuration for the editor
 */
export interface EditorThemeConfig {
  /** CSS custom properties for theming */
  cssVariables?: Record<string, string>;
  /** Base theme: 'light' | 'dark' */
  baseTheme?: 'light' | 'dark';
}

/**
 * Main editor configuration
 */
export interface EditorConfig {
  /** Initial document value */
  value: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CodeMirror extensions */
  extensions?: Extension[];
  /** Live preview configuration (false to disable) */
  livePreview?: LivePreviewConfig | false;
  /** Theme configuration */
  theme?: EditorThemeConfig | Extension;
  /** Additional keymap bindings */
  keymap?: KeymapBinding[];
  /** Called when document content changes */
  onChange?: (value: string) => void;
  /** Called when selection changes */
  onSelectionChange?: (selection: EditorSelection) => void;
}

/**
 * Editor instance returned by createEditor
 */
export interface EditorInstance {
  /** CodeMirror EditorView */
  view: EditorView;
  /** Update document value programmatically */
  update: (value: string) => void;
  /** Destroy the editor and cleanup */
  destroy: () => void;
  /** Get current document value */
  getValue: () => string;
  /** Get current EditorState */
  getState: () => EditorState;
}

/**
 * Command specification for toolbar
 */
export interface CommandSpec {
  /** Unique command identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Icon component (React element or string) */
  icon?: any;
  /** Command parameters for forms */
  params?: CommandParam[];
  /** Execute function */
  run: (view: EditorView, values?: Record<string, any>) => boolean;
  /** Whether command has a form */
  hasForm?: boolean;
}

/**
 * Command parameter for forms
 */
export interface CommandParam {
  name: string;
  type: 'text' | 'number' | 'select' | 'static';
  label?: string;
  options?: string[];
  default?: any;
  required?: boolean;
}

/**
 * Keyboard shortcut binding
 */
export interface KeyBinding {
  key: string;
  run: (view: EditorView) => boolean;
  preventDefault?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
}

/**
 * Props for React MarkdownEditor component
 */
export interface MarkdownEditorProps {
  /** Current document value */
  value: string;
  /** Called on value change */
  onChange: (value: string) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Editor variant */
  variant?: 'source' | 'live' | 'split';
  /** Live preview configuration */
  livePreviewConfig?: LivePreviewConfig;
  /** Toolbar configuration */
  toolbarConfig?: ToolbarConfig;
  /** Minimum height */
  minHeight?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toolbar configuration
 */
export interface ToolbarConfig {
  /** Custom commands to add to toolbar */
  customCommands?: CommandSpec[];
  /** Groups to show */
  groups?: string[];
  /** i18n labels */
  labels?: Record<string, string>;
}

/**
 * Hook return type for useMarkdownEditor
 */
export interface UseMarkdownEditorReturn {
  /** Editor instance (null until mounted) */
  editor: EditorInstance | null;
  /** Update value imperatively */
  setValue: (value: string) => void;
  /** Get current value */
  getValue: () => string;
  /** Focus the editor */
  focus: () => void;
}