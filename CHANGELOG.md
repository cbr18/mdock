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

### Notes

- `1.0.0` is intentionally not used yet. WebDAV compatibility, editor behavior, backup/restore and upgrade contracts still need to settle.
