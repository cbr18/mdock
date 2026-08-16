# Vault file browser и markdown viewer

Status: DONE
Created: 2026-08-15 22:25
Project: mdock
Plan: [15_08_2026_22_25_vault_file_browser_viewer.md](../plans/15_08_2026_22_25_vault_file_browser_viewer.md)

## Проблема

Vault page показывает metadata/git/WebDAV, но не показывает структуру vault и файлы. Backend File API уже готов, но UI ещё не использует его.

## Доказательства

- `docs/server-api.md` содержит File API endpoints.
- `web/src/pages/VaultPage.jsx` не вызывает file endpoints.
- Viewer/preview отсутствует.

## Нефункциональные ограничения

- Viewer должен использовать глобальную тему и tokens.
- Markdown rendering должен быть максимально близок к Obsidian для MVP: GFM, frontmatter, code blocks, tables, checklists.
- Не делать WYSIWYG/editor в этой задаче, только file browser + viewer.
- Не открывать binary как text.

## Не входит в задачу

- CodeMirror editor/save flow.
- Wikilinks/backlinks/embeds/mermaid.
- Upload UI.
- Search.

## Желаемое поведение

- Vault page показывает дерево/список файлов и директорий.
- Пользователь может переходить по директориям.
- Пользователь может открыть markdown/text file и увидеть metadata + preview.
- Markdown preview поддерживает GFM, frontmatter и syntax highlight в code blocks.
- Viewer layout работает на mobile/desktop.

## Затронутые области

- `web/src/api/`
- `web/src/features/files/`
- `web/src/pages/VaultPage.jsx`
- `web/src/styles.css`
- tests

## Заметки по реализации

- Использовать существующий File API.
- Для preview использовать уже установленные `react-markdown`, `remark-gfm`, `remark-frontmatter`, `rehype-highlight`.
- Начать с read-only viewer; editor будет отдельной следующей задачей.

## Критерии приёмки

- File tree/list отображается для active vault.
- Archived vault не пытается грузить files.
- Markdown preview отображает headings, lists, checklists, tables, code blocks.
- UI не имеет horizontal overflow на mobile/desktop.
- Tests проходят.

## План тестирования

- `npm test`
- `npm run build`
- Docker rebuild test stack
- Playwright UI smoke: открыть vault, увидеть файлы, открыть markdown preview.

## Результаты валидации

- `go test ./...` — passed.
- `npm test` в `web/` — passed, 8 tests.
- `npm run build` в `web/` — passed, есть warning Vite по chunk > 500 KB из-за markdown/highlight зависимостей.

## Откат

Откатить frontend file browser/viewer changes. Backend File API не трогать.
