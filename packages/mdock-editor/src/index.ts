// Core entry point for @mdock/editor

// Types
export type {
  BlockType,
  SplitBlock,
  BlockSplitterFn,
  LivePreviewConfig,
  EditorThemeConfig,
  EditorConfig,
  EditorInstance,
  CommandSpec,
  CommandParam,
  KeyBinding,
  MarkdownEditorProps,
  ToolbarConfig,
  UseMarkdownEditorReturn,
} from './core/types';

// Core factory
export { createEditor, createReactEditor } from './core/createEditor';

// Extensions
export { livePreviewExtension } from './core/extensions/livePreview';
export { createEditorTheme } from './core/extensions/theme';
export { wikilinkAutocomplete, type WikilinkAutocompleteConfig } from './core/extensions/autocomplete';

// Commands
export { COMMANDS, applyCommandToView, initialFormValues, PARAM_LABEL_KEYS, FORM_MENU } from './core/commands/toolbarCommands';
export * from './core/commands/markdownCommands';

// Splitters
export { splitBlocks, getSplitBlocks, blockAtPosition, createBlock } from './core/splitters/blockSplitter';
export type { SplitBlock } from './core/splitters/blockSplitter';

// Widgets
export { RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget } from './core/widgets/RenderedBlockWidget';
export { cursorPositionFromClick, activeBlockRange, isActiveBlock, rangesIntersect, caretFromPoint, splitFrontmatter } from './core/widgets/RenderedBlockWidget';