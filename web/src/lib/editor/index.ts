// Main entry point for @mdock/editor library

// Core
export * from './core';

// React wrapper
export { MarkdownEditor } from './react/MarkdownEditor';
export { useMarkdownEditor } from './react/useMarkdownEditor';
export type { MarkdownEditorProps, ToolbarConfig } from './core/types';

// Styles (import in your app entry point)
// import '@mdock/editor/styles.css';