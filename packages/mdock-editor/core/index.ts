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
} from './types';

// Core factory
export { createEditor, createReactEditor } from './createEditor';

// Extensions
export { livePreviewExtension } from './extensions/livePreview';
export { createEditorTheme } from './extensions/theme';

// Commands
export { COMMANDS, applyCommandToView, initialFormValues, PARAM_LABEL_KEYS, FORM_MENU } from './commands/toolbarCommands';
export * from './commands/markdownCommands';

// Splitters
export { splitBlocks, getSplitBlocks, blockAtPosition, createBlock } from './splitters/blockSplitter';
export type { SplitBlock } from './splitters/blockSplitter';

// Widgets
export { RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget } from './widgets/RenderedBlockWidget';
export { cursorPositionFromClick, activeBlockRange, isActiveBlock, rangesIntersect, caretFromPoint, splitFrontmatter } from './widgets/RenderedBlockWidget';