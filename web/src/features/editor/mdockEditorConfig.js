/**
 * mdock-specific configuration for @mdock/editor library
 * This file connects the library with mdock's infrastructure (i18n, theme, plugins, etc.)
 */

import { livePreviewExtension, remarkCallout, rehypeCallout, remarkEmbed, rehypeEmbed, remarkMermaid, rehypeMermaid } from '@mdock/editor';
import { markdownRemarkPlugins, markdownRehypePlugins, splitFrontmatter } from '../files/MarkdownPreview.jsx';

/**
 * Live preview configuration for mdock
 * Pass this to MarkdownEditor as livePreviewConfig prop
 */
export const mdockLivePreviewConfig = {
  frontmatterLabel: 'Frontmatter', // Will be overridden by i18n in MarkdownEditor.jsx
  renderPlugins: {
    remark: [...markdownRemarkPlugins, remarkCallout, remarkEmbed, remarkMermaid],
    rehype: [...markdownRehypePlugins, rehypeCallout, rehypeEmbed, rehypeMermaid],
  },
  // Block splitter uses library default (getSplitBlocks)
  // Widgets use library defaults (RenderedMarkdownBlockWidget, RenderedMarkdownDocumentWidget)
};

/**
 * Get live preview config with localized frontmatter label
 */
export function getMdockLivePreviewConfig(t) {
  return {
    ...mdockLivePreviewConfig,
    frontmatterLabel: t('frontmatter'),
  };
}

/**
 * mdock-specific commands that extend the base library commands
 * These are added to the toolbar in MarkdownEditor.jsx
 */
export const MDOCK_COMMANDS = {
  wikilink: {
    id: 'wikilink',
    label: 'Wikilink',
    params: [
      { name: 'target', type: 'text', label: 'Page', required: true },
      { name: 'alias', type: 'text', label: 'Alias', default: '' },
    ],
    run: (view, values) => {
      // Import applyCommandToView dynamically to avoid circular deps
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'wikilink', values);
    },
    hasForm: true,
    openPicker: (view, onSelect) => {
      // Open the wikilink picker modal
      // This will be handled by MarkdownEditor.jsx
      // The actual picker is rendered by the adapter
    },
  },
  embed: {
    id: 'embed',
    label: 'Embed',
    params: [
      { name: 'target', type: 'text', label: 'File', required: true },
    ],
    run: (view, values) => {
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'embed', values);
    },
    hasForm: true,
  },
  callout: {
    id: 'callout',
    label: 'Callout',
    icon: 'quote',
    params: [
      { name: 'type', type: 'select', label: 'Type', options: ['note', 'info', 'tip', 'warning', 'danger', 'success', 'question'], default: 'note' },
    ],
    run: (view, values) => {
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'callout', values);
    },
    hasForm: true,
  },
  metadata: {
    id: 'metadata',
    label: 'Metadata',
    icon: 'braces',
    run: (view) => {
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'metadata');
    },
  },
  mermaid: {
    id: 'mermaid',
    label: 'Mermaid Diagram',
    icon: 'gitBranch',
    run: (view) => {
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'mermaid');
    },
  },
  blockId: {
    id: 'blockId',
    label: 'Block ID',
    icon: 'hash',
    params: [
      { name: 'blockId', type: 'text', label: 'Block ID', required: false, default: '' },
    ],
    run: (view, values) => {
      const { applyCommandToView } = require('@mdock/editor');
      return applyCommandToView(view, 'blockId', values);
    },
    hasForm: true,
  },
};

/**
 * Toolbar groups configuration for mdock
 * Maps to the toolbar structure in MarkdownEditor.jsx
 */
export const MDOCK_TOOLBAR_GROUPS = {
  paragraph: {
    name: 'paragraph',
    label: 'Paragraph',
    icon: 'pilcrow',
    commands: ['paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'quote', 'codeBlock'],
  },
  inline: {
    name: 'inline',
    label: 'Inline Formatting',
    icon: 'bold',
    commands: ['bold', 'italic', 'strikethrough', 'highlight', 'inlineCode', 'comment'],
  },
  lists: {
    name: 'lists',
    label: 'List Formatting',
    icon: 'list',
    commands: ['bulletList', 'orderedList', 'taskList', 'taskDone', 'indent', 'outdent'],
  },
  insert: {
    name: 'insert',
    label: 'Insert',
    icon: 'rows2',
    commands: ['link', 'image', 'wikilink', 'embed', 'table', 'callout', 'horizontalRule', 'inlineMath', 'blockMath', 'footnote', 'blockId', 'metadata', 'mermaid'],
  },
};

/**
 * Parameter label keys for i18n (extends library's PARAM_LABEL_KEYS)
 */
export const MDOCK_PARAM_LABEL_KEYS = {
  target: 'formTarget',
  alias: 'formAlias',
  type: 'formType',
  rows: 'formRows',
  cols: 'formColumns',
  id: 'formId',
  text: 'formText',
  key: 'formKey',
  value: 'formValue',
  lang: 'formLanguage',
  blockId: 'formBlockId',
};