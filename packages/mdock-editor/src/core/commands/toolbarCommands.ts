/**
 * Toolbar commands configuration
 * Extracted from toolbarActions.js
 */

import type { CommandSpec, CommandParam } from '../types';
import { applyCommandToView } from './markdownCommands';

/** Parameter label keys for i18n */
export const PARAM_LABEL_KEYS: Record<string, string> = {
  url: 'formUrl',
  label: 'formLabel',
  alt: 'formAlt',
  target: 'formTarget',
  alias: 'formAlias',
  title: 'formTitle',
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

/** Menu mapping for command forms */
export const FORM_MENU: Record<string, string> = {
  codeBlock: 'paragraph',
  link: 'insert',
  image: 'insert',
  wikilink: 'insert',
  embed: 'insert',
  table: 'insert',
  callout: 'insert',
  footnote: 'insert',
  metadata: 'insert',
};

/** Base commands available in the editor */
export const COMMANDS: Record<string, CommandSpec> = {
  // Paragraph/Heading commands
  paragraph: {
    id: 'paragraph',
    label: 'Paragraph',
    icon: 'pilcrow',
    run: (view) => applyCommandToView(view, 'paragraph'),
  },
  heading1: {
    id: 'heading1',
    label: 'Heading 1',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading1'),
  },
  heading2: {
    id: 'heading2',
    label: 'Heading 2',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading2'),
  },
  heading3: {
    id: 'heading3',
    label: 'Heading 3',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading3'),
  },
  heading4: {
    id: 'heading4',
    label: 'Heading 4',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading4'),
  },
  heading5: {
    id: 'heading5',
    label: 'Heading 5',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading5'),
  },
  heading6: {
    id: 'heading6',
    label: 'Heading 6',
    icon: 'heading',
    run: (view) => applyCommandToView(view, 'heading6'),
  },
  quote: {
    id: 'quote',
    label: 'Quote',
    icon: 'quote',
    run: (view) => applyCommandToView(view, 'quote'),
  },
  codeBlock: {
    id: 'codeBlock',
    label: 'Code Block',
    icon: 'code',
    params: [
      { name: 'lang', type: 'select', label: 'Language', options: ['', 'js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'cpp', 'json', 'yaml', 'md', 'txt'], default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'codeBlock', values),
    hasForm: true,
  },

  // Inline formatting
  bold: {
    id: 'bold',
    label: 'Bold',
    icon: 'bold',
    run: (view) => applyCommandToView(view, 'bold'),
  },
  italic: {
    id: 'italic',
    label: 'Italic',
    icon: 'italic',
    run: (view) => applyCommandToView(view, 'italic'),
  },
  strikethrough: {
    id: 'strikethrough',
    label: 'Strikethrough',
    icon: 'strikethrough',
    run: (view) => applyCommandToView(view, 'strikethrough'),
  },
  highlight: {
    id: 'highlight',
    label: 'Highlight',
    icon: 'highlighter',
    run: (view) => applyCommandToView(view, 'highlight'),
  },
  inlineCode: {
    id: 'inlineCode',
    label: 'Inline Code',
    icon: 'code',
    run: (view) => applyCommandToView(view, 'inlineCode'),
  },
  comment: {
    id: 'comment',
    label: 'Comment',
    icon: 'message-square',
    run: (view) => applyCommandToView(view, 'comment'),
  },

  // Lists
  bulletList: {
    id: 'bulletList',
    label: 'Bullet List',
    icon: 'list',
    run: (view) => applyCommandToView(view, 'bulletList'),
  },
  orderedList: {
    id: 'orderedList',
    label: 'Ordered List',
    icon: 'list-ordered',
    run: (view) => applyCommandToView(view, 'orderedList'),
  },
  taskList: {
    id: 'taskList',
    label: 'Task List',
    icon: 'check-square',
    run: (view) => applyCommandToView(view, 'taskList'),
  },
  taskDone: {
    id: 'taskDone',
    label: 'Task Done',
    icon: 'check-square',
    run: (view) => applyCommandToView(view, 'taskDone'),
  },
  indent: {
    id: 'indent',
    label: 'Indent',
    run: (view) => applyCommandToView(view, 'indent'),
  },
  outdent: {
    id: 'outdent',
    label: 'Outdent',
    run: (view) => applyCommandToView(view, 'outdent'),
  },

  // Insert commands
  link: {
    id: 'link',
    label: 'Link',
    icon: 'link',
    params: [
      { name: 'url', type: 'text', label: 'URL', required: true },
      { name: 'label', type: 'text', label: 'Link Text', default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'link', values),
    hasForm: true,
  },
  image: {
    id: 'image',
    label: 'Image',
    icon: 'image',
    params: [
      { name: 'url', type: 'text', label: 'Image URL', required: true },
      { name: 'alt', type: 'text', label: 'Alt Text', default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'image', values),
    hasForm: true,
  },
  wikilink: {
    id: 'wikilink',
    label: 'Wikilink',
    params: [
      { name: 'target', type: 'text', label: 'Page', required: true },
      { name: 'alias', type: 'text', label: 'Alias', default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'wikilink', values),
    hasForm: true,
  },
  embed: {
    id: 'embed',
    label: 'Embed',
    params: [
      { name: 'target', type: 'text', label: 'File', required: true },
    ],
    run: (view, values) => applyCommandToView(view, 'embed', values),
    hasForm: true,
  },
  table: {
    id: 'table',
    label: 'Table',
    icon: 'table',
    params: [
      { name: 'rows', type: 'number', label: 'Rows', default: 2, min: 1 },
      { name: 'cols', type: 'number', label: 'Columns', default: 2, min: 1 },
    ],
    run: (view, values) => applyCommandToView(view, 'table', values),
    hasForm: true,
  },
  callout: {
    id: 'callout',
    label: 'Callout',
    icon: 'quote',
    params: [
      { name: 'type', type: 'select', label: 'Type', options: ['note', 'info', 'tip', 'warning', 'danger', 'success', 'question'], default: 'note' },
    ],
    run: (view, values) => applyCommandToView(view, 'callout', values),
    hasForm: true,
  },
  horizontalRule: {
    id: 'horizontalRule',
    label: 'Horizontal Rule',
    icon: 'minus',
    run: (view) => applyCommandToView(view, 'horizontalRule'),
  },
  inlineMath: {
    id: 'inlineMath',
    label: 'Inline Math',
    icon: 'sigma',
    run: (view) => applyCommandToView(view, 'inlineMath'),
  },
  blockMath: {
    id: 'blockMath',
    label: 'Block Math',
    icon: 'sigma',
    run: (view) => applyCommandToView(view, 'blockMath'),
  },
  footnote: {
    id: 'footnote',
    label: 'Footnote',
    params: [
      { name: 'id', type: 'text', label: 'Footnote ID', required: true },
      { name: 'text', type: 'text', label: 'Footnote Text', default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'footnote', values),
    hasForm: true,
  },
  blockId: {
    id: 'blockId',
    label: 'Block ID',
    icon: 'hash',
    params: [
      { name: 'blockId', type: 'text', label: 'Block ID', required: false, default: '' },
    ],
    run: (view, values) => applyCommandToView(view, 'blockId', values),
    hasForm: true,
  },
  metadata: {
    id: 'metadata',
    label: 'Metadata',
    icon: 'braces',
    run: (view) => applyCommandToView(view, 'metadata'),
  },
};

/**
 * Get initial form values for a command
 */
export function initialFormValues(command: CommandSpec): Record<string, any> {
  const values: Record<string, any> = {};
  if (command.params) {
    for (const param of command.params) {
      if (param.type !== 'static') {
        values[param.name] = param.default ?? '';
      }
    }
  }
  return values;
}

/**
 * Apply a command to a CodeMirror view
 * This is re-exported from markdownCommands for convenience
 */
export { applyCommandToView } from './markdownCommands';