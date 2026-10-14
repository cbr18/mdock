/**
 * Main editor factory function
 * Creates a CodeMirror 6 editor instance with Markdown support
 */

import { EditorView, EditorState, basicSetup } from '@codemirror/basic-setup';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { Extension } from '@codemirror/state';
import type { EditorConfig, EditorInstance, LivePreviewConfig } from './types';
import { livePreviewExtension } from './extensions/livePreview';
import { createEditorTheme } from './extensions/theme';

/**
 * Create a Markdown editor instance
 */
export function createEditor(config: EditorConfig): EditorInstance {
  const {
    value = '',
    readOnly = false,
    extensions = [],
    livePreview,
    theme,
    keymap = [],
    onChange,
    onSelectionChange,
  } = config;

  // Build extensions array
  const editorExtensions: Extension[] = [
    // Base markdown language support
    markdown({ base: markdownLanguage }),
    // Basic setup (history, line numbers, etc.)
    basicSetup,
  ];

  // Add read-only extensions if needed
  if (readOnly) {
    editorExtensions.push(
      EditorState.readOnly.of(true),
      EditorView.editable.of(false)
    );
  }

  // Add live preview extension if enabled
  if (livePreview !== false) {
    const lpConfig: LivePreviewConfig = {
      frontmatterLabel: 'Frontmatter',
      ...(typeof livePreview === 'object' ? livePreview : {}),
    };
    editorExtensions.push(...livePreviewExtension(lpConfig));
  }

  // Add theme
  if (theme) {
    if (typeof theme === 'object' && 'cssVariables' in theme) {
      editorExtensions.push(createEditorTheme(theme));
    } else {
      editorExtensions.push(theme);
    }
  }

  // Add custom keymap
  if (keymap.length > 0) {
    editorExtensions.push(keymap);
  }

  // Add custom extensions
  editorExtensions.push(...extensions);

  // Create initial state
  const state = EditorState.create({
    doc: value,
    extensions: editorExtensions,
  });

  // Create view
  let view: EditorView | null = null;
  let mounted = false;

  const createView = (parent: HTMLElement) => {
    view = new EditorView({
      state,
      parent,
    });

    // Set up change listener
    if (onChange) {
      view.dispatch = ((originalDispatch) => (transaction) => {
        originalDispatch(transaction);
        if (transaction.docChanged) {
          onChange(transaction.state.doc.toString());
        }
      })(view.dispatch);
    }

    // Set up selection change listener
    if (onSelectionChange) {
      const originalDispatch = view.dispatch;
      view.dispatch = (transaction) => {
        originalDispatch(transaction);
        if (transaction.selection) {
          onSelectionChange(transaction.state.selection.main);
        }
      };
    }

    mounted = true;
    return view;
  };

  // Return editor instance
  return {
    get view() {
      return view;
    },
    get isMounted() {
      return !!view;
    },
    mount: createView,
    update: (newValue: string) => {
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newValue },
      });
    },
    destroy: () => {
      if (view) {
        view.destroy();
        view = null;
        mounted = false;
      }
    },
    getValue: () => view?.state.doc.toString() ?? value,
    getState: () => view?.state,
  };
}

/**
 * Create editor with React-friendly interface
 * Returns an object with mount/unmount for useEffect
 */
export function createReactEditor(config: EditorConfig) {
  const editor = createEditor(config);

  return {
    ...editor,
    mount: (parent: HTMLElement) => editor.mount(parent),
    unmount: () => editor.destroy(),
  };
}

// Re-export types and utilities
export type { EditorConfig, EditorInstance, LivePreviewConfig } from './types';
export { livePreviewExtension } from './extensions/livePreview';
export { createEditorTheme } from './extensions/theme';