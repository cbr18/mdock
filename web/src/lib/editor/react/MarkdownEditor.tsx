/**
 * React wrapper for Markdown editor
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createReactEditor, type EditorConfig, type EditorInstance, type LivePreviewConfig, type ToolbarConfig } from '../core';
import type { MarkdownEditorProps } from '../core/types';

/**
 * React hook for using the Markdown editor
 */
export function useMarkdownEditor(config: EditorConfig) {
  const editorRef = useRef<EditorInstance | null>(null);
  const [mounted, setMounted] = useState(false);

  const editor = useMemo(() => createReactEditor(config), [
    config.value,
    config.readOnly,
    config.livePreview,
    config.theme,
  ]);

  const mount = useCallback((parent: HTMLElement) => {
    editor.mount(parent);
    setMounted(true);
  }, [editor]);

  const unmount = useCallback(() => {
    editor.unmount();
    setMounted(false);
  }, [editor]);

  return {
    editor: mounted ? editor : null,
    mount,
    unmount,
    setValue: editor.update,
    getValue: editor.getValue,
    focus: () => editor.view?.focus(),
  };
}

/**
 * Main MarkdownEditor React component
 */
export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  variant = 'source',
  livePreviewConfig,
  toolbarConfig,
  minHeight = '520px',
  className = '',
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const [mounted, setMounted] = useState(false);

  // Build editor config
  const editorConfig = useMemo<EditorConfig>(() => ({
    value,
    readOnly,
    livePreview: variant === 'live' ? livePreviewConfig : false,
    onChange,
    extensions: [],
  }), [value, readOnly, variant, livePreviewConfig, onChange]);

  // Create editor instance
  const editor = useMemo(() => createReactEditor(editorConfig), [
    editorConfig.value,
    editorConfig.readOnly,
    editorConfig.livePreview,
    editorConfig.onChange,
  ]);

  // Mount/unmount on container changes
  useEffect(() => {
    if (containerRef.current && !mounted) {
      editor.mount(containerRef.current);
      setMounted(true);
    }
    return () => {
      if (mounted) {
        editor.unmount();
        setMounted(false);
      }
    };
  }, [editor, mounted]);

  // Update value when props change
  useEffect(() => {
    if (mounted && editorRef.current) {
      editor.update(value);
    }
  }, [value, mounted, editor]);

  editorRef.current = editor;

  // Render based on variant
  if (variant === 'split') {
    return (
      <div className={`split-document-view ${className}`} style={{ minHeight }}>
        <div className="document-pane" aria-label="Source">
          <div ref={containerRef} className="markdown-editor-shell" style={{ height: '100%', minHeight: 0 }} />
        </div>
        <div className="document-pane" aria-label="Rendered">
          <div className="rendered-preview-view" style={{ minHeight: 0 }}>
            <LivePreviewContent content={value} livePreviewConfig={livePreviewConfig} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'live') {
    return (
      <div className={`live-document-view ${className}`} style={{ minHeight }}>
        <div ref={containerRef} className="markdown-editor-shell" style={{ height: '100%', minHeight: 0 }} />
      </div>
    );
  }

  // Source mode
  return (
    <div ref={containerRef} className={`markdown-editor-shell ${className}`} style={{ minHeight }} />
  );
}

/**
 * Live preview content component (for split view)
 */
function LivePreviewContent({ content, livePreviewConfig }: { content: string; livePreviewConfig?: LivePreviewConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const [mounted, setMounted] = useState(false);

  const editorConfig = useMemo<EditorConfig>(() => ({
    value: content,
    readOnly: true,
    livePreview: livePreviewConfig,
    extensions: [],
  }), [content, livePreviewConfig]);

  const editor = useMemo(() => createReactEditor(editorConfig), [
    editorConfig.value,
    editorConfig.livePreview,
  ]);

  useEffect(() => {
    if (containerRef.current && !mounted) {
      editor.mount(containerRef.current);
      setMounted(true);
    }
    return () => {
      if (mounted) {
        editor.unmount();
        setMounted(false);
      }
    };
  }, [editor, mounted]);

  useEffect(() => {
    if (mounted) {
      editor.update(content);
    }
  }, [content, mounted, editor]);

  return <div ref={containerRef} className="markdown-editor-shell" style={{ height: '100%', minHeight: 0 }} />;
}

export default MarkdownEditor;