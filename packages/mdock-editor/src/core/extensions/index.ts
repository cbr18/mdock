/**
 * Extensions barrel export
 */

export { livePreviewExtension } from './livePreview';
export { createEditorTheme } from './theme';
export { wikilinkAutocomplete, type WikilinkAutocompleteConfig } from './autocomplete';
export { remarkMermaid } from './remark-mermaid';
export { rehypeMermaid } from './rehype-mermaid';
export { remarkFootnotes } from './remark-footnotes';
export { rehypeFootnotes } from './rehype-footnotes';
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
} from './mermaid-renderer';