# Markdown editor UI

Status: DONE
Created: 2026-08-16 12:18
Project: mdock
Plan: [16_08_2026_12_18_markdown_editor_ui.md](../plans/16_08_2026_12_18_markdown_editor_ui.md)

## Проблема

Веб-морда сейчас показывает дерево файлов, rendered/source/split preview, но не даёт редактировать и сохранять Markdown через удобный интерфейс.

## Доказательства

- `VaultFilesPanel` использует read-only preview/source.
- Пользователь запросил toolbar/popover интерфейс уровня Word/Confluence, но с Obsidian-compatible Markdown.

## Нефункциональные ограничения

- Перед реализацией UI использовать `web-design-guidelines`.
- Использовать глобальную тему и RU/EN i18n.
- CodeMirror 6 как editor engine.
- Не делать proprietary WYSIWYG storage.
- UI должен быть удобен на desktop и не разваливаться на mobile.
- Все операции сохранения идут через существующий JSON API и locks.

## Не входит в задачу

- Mermaid render parity.
- MathJax/KaTeX render parity.
- Backlinks graph.
- Multi-user real-time collaboration.

## Желаемое поведение

- При выборе `.md` файл открывается в editable CodeMirror editor.
- Клиент берёт lock, отправляет heartbeat и release.
- Есть Save/reload dirty state.
- Toolbar содержит группы Paragraph, Inline, Lists, Insert, View.
- Popover/dialog controls создают Obsidian-compatible Markdown.
- Split mode показывает editor и preview рядом.

## Затронутые области

- `web/src/features/files/`
- `web/src/features/editor/`
- `web/src/features/i18n/`
- `web/src/styles.css`
- frontend tests

## Заметки по реализации

- Начать с source editor и toolbar. Live Preview/WYSIWYG не делать.
- Toolbar commands вызывают pure helpers из задачи logic.
- Lock status показывать рядом с Save.

## Критерии приёмки

- Пользователь может изменить `.md`, сохранить, переключить файл и увидеть сохранённое содержимое.
- Locked file показывает ошибку и не теряет локальные изменения.
- Toolbar actions покрывают MVP actions из документа требований.
- UI проходит design review по `web-design-guidelines`.
- `npm test`, `npm run build`, `go test ./...` проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- Ручной smoke через локальный web UI.

## Результаты валидации

- `web-design-guidelines` применён к новым editor UI changes; добавлены live status, labels, dirty `beforeunload`, theme-token CSS.
- `npm test` в `web/` — passed, 22 tests.
- `npm run build` в `web/` — passed; Vite warning о chunk > 500 kB и множественных CodeMirror language chunks зафиксирован как будущая оптимизация bundle.
- `go test ./...` — passed.

## Откат

Откатить editor UI components/styles/tests, оставить backend file API без изменений.
