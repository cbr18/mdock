# Changelog

All notable mdock changes should be recorded here.

The project uses SemVer-style versions while staying pre-1.0. Before `1.0.0`, minor versions may still include breaking API/env/storage changes, but every breaking change must be called out explicitly.

## [0.1.0-alpha.1] - Unreleased

### Added

- Initial release train placeholder for the current MVP line.
- Go backend with SQLite runtime state, local vault storage, local git history and WebDAV access.
- React/Vite web UI with authentication, vault management, file tree, markdown preview/editor modes and theme/language settings.
- Forgejo CI/CD workflows for tests and production deploy from `main`.
- Release strategy, `VERSION`, `mdock version` and `GET /api/version`.

### Fixed

- **Editor crash on blank page when enabling edit mode** — removed a dead `ViewPlugin.fromClass` block in the live-preview extension that referenced an unimported `ViewPlugin` (and only surfaced when the live editor mounted) and added the missing `history` import from `@codemirror/commands`.
- **Live preview not rendering Markdown (tables, highlighting, etc.) in view/edit mode**:
  - Unified the CodeMirror dependency set on CodeMirror 6 (`codemirror@^6.0.0` instead of the stale `@codemirror/basic-setup@0.20`, which dragged in a nested `@codemirror/state@0.20` copy that `StateField`s from 6.x could not be recognized by).
  - Fixed `RenderedMarkdownDocumentWidget.renderContent` destructuring `remarkPlugins`/`rehypePlugins` from a `renderPlugins` object whose keys are `remark`/`rehype` — plugin arrays were always `undefined`, so GFM tables and `rehype-highlight` never applied in the live widget.
  - Removed the broken math render plugins (`mathRenderPlugins`) from the live-preview config: they were an async-promise array nested into the plugin list and the `remark-math`/`rehype-katex` packages are not installed in the web app.
- **Live preview styling** — applied the `cm-live-preview` root class via `EditorView.editorAttributes` so live preview uses the Inter document font / gutters-off styling like the plain rendered view.
- **Double frame around the live editor** — removed the extra wrapping `.live-document-view` in `VaultFilesPanel` since the library editor already renders its own container for the `live` variant.

### Notes

- `1.0.0` is intentionally not used yet. WebDAV compatibility, editor behavior, backup/restore and upgrade contracts still need to settle.
