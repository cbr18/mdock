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
export { wikilinkAutocomplete, type WikilinkAutocompleteConfig } from './extensions/autocomplete';
export { createMathPlugins, mathRenderPlugins, withMath, loadKatexStyles, isKatexAvailable, type MathConfig } from './extensions/math';
export { remarkCallout } from './extensions/remark-callout';
export { rehypeCallout } from './extensions/rehype-callout';
export { remarkEmbed } from './extensions/remark-embed';
export { rehypeEmbed } from './extensions/rehype-embed';
export { remarkMermaid } from './extensions/remark-mermaid';
export { rehypeMermaid } from './extensions/rehype-mermaid';
export { remarkFootnotes } from './extensions/remark-footnotes';
export { rehypeFootnotes } from './extensions/rehype-footnotes';
export {
  initMermaid,
  updateMermaidTheme,
  renderMermaid,
  copyMermaidAsSvg,
  copyMermaidAsPng,
  openMermaidFullscreen,
  rerenderAllDiagrams,
  autoRenderMermaid,
  getMermaidVersion,
  setMermaidVersion,
} from './extensions/mermaid-renderer';
export {
  slugifyHeading,
  extractHeadings,
  detectHeadingChanges,
  updateWikilinksForHeadingChanges,
  updateWikilinksInPage,
  processHeadingRename,
  type HeadingInfo,
  type HeadingChangeResult,
} from './extensions/headingRefs';

// Live preview effects and types
export { setActiveBlock, setFocusedBlock, type FocusedBlock, navigateToPage } from './extensions/livePreview';

// Commands
export { COMMANDS, applyCommandToView, initialFormValues, PARAM_LABEL_KEYS, FORM_MENU } from './commands/toolbarCommands';
export * from './commands/markdownCommands';

// Splitters
export { splitBlocks, getSplitBlocks, blockAtPosition, createBlock } from './splitters/blockSplitter';
export type { SplitBlock } from './splitters/blockSplitter';

// Widgets
export { RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget } from './widgets/RenderedBlockWidget';
export { cursorPositionFromClick, activeBlockRange, isActiveBlock, rangesIntersect, caretFromPoint, splitFrontmatter } from './widgets/RenderedBlockWidget';