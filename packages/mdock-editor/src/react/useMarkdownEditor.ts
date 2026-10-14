/**
 * useMarkdownEditor hook
 * Provides imperative control over the editor instance
 */

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { createReactEditor, type EditorConfig, type EditorInstance, type UseMarkdownEditorReturn } from '../core';

/**
 * Hook for using Markdown editor imperatively
 */
export function useMarkdownEditor(config: EditorConfig): UseMarkdownEditorReturn {
  const editorRef = useRef<EditorInstance | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const editor = useMemo(() => createReactEditor(config), [
    config.value,
    config.readOnly,
    config.livePreview,
    config.theme,
  ]);

  const mount = useCallback((parent: HTMLElement) => {
    containerRef.current = parent;
    editor.mount(parent);
    setMounted(true);
  }, [editor]);

  const unmount = useCallback(() => {
    if (containerRef.current) {
      editor.unmount();
      containerRef.current = null;
      setMounted(false);
    }
  }, [editor]);

  const setValue = useCallback((value: string) => {
    editor.update(value);
  }, [editor]);

  const getValue = useCallback(() => {
    return editor.getValue();
  }, [editor]);

  const focus = useCallback(() => {
    editor.view?.focus();
  }, [editor]);

  // Update config when it changes
  useEffect(() => {
    if (mounted && editorRef.current) {
      // Recreate editor if critical config changes
      // For now just update value
      editor.update(config.value);
    }
  }, [config.value, config.readOnly, config.livePreview]);

  editorRef.current = editor;

  return {
    editor,
    mount,
    unmount,
    setValue,
    getValue,
    focus,
  };
}

export default useMarkdownEditor;