# Markdown editor logic

Status: DONE
Created: 2026-08-16 12:17
Project: mdock
Plan: [16_08_2026_12_17_markdown_editor_logic.md](../plans/16_08_2026_12_17_markdown_editor_logic.md)

## Проблема

Для богатого редактора нужны переиспользуемые Markdown-трансформации и клиентская логика lock/save lifecycle. Если зашить всё прямо в UI, тестировать совместимость и edge cases будет сложно.

## Доказательства

- File API и lock endpoints уже есть, но `web/src/api/files.js` умеет только list/read.
- Текущий viewer не умеет сохранить изменения.
- Toolbar должен генерировать Obsidian-compatible source Markdown.

## Нефункциональные ограничения

- Трансформации должны быть pure functions и покрываться unit tests.
- Не нормализовать весь документ.
- Не ломать неизвестный Obsidian syntax.
- Save/lock logic должна сохранять dirty buffer при ошибках.
- Без новых runtime dependencies без необходимости.

## Не входит в задачу

- Полный визуальный интерфейс toolbar.
- Render parity Mermaid/Math/embeds.
- Collaborative editing.

## Желаемое поведение

- Есть API wrappers для create/write/move/delete/locks.
- Есть editor core helpers для inline/block/list/table/link/callout/math/frontmatter операций.
- Есть тесты на Markdown transforms и save/lock error handling.

## Затронутые области

- `web/src/api/files.js`
- `web/src/features/files/` или `web/src/features/editor/`
- `web/src/App.test.jsx` или отдельные unit tests
- `docs/markdown-editor-requirements.md`

## Заметки по реализации

- Начать с `web/src/features/editor/markdownActions.js`.
- Возвращать `{ text, selectionStart, selectionEnd }`.
- Для CodeMirror потом использовать эти helpers через current selection.
- Lock heartbeat interval должен быть меньше server `LOCK_TTL`; на клиенте использовать безопасный default 15s.

## Критерии приёмки

- Pure transform tests проходят.
- API wrapper tests или integration tests покрывают lock/save happy path и locked error.
- Существующие `npm test`, `npm run build`, `go test ./...` проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`

## Результаты валидации

- `npm test` в `web/` — passed, 22 tests.
- `npm run build` в `web/` — passed; Vite warning о chunk > 500 kB остался информационным.
- `go test ./...` — passed после завершения frontend build. Первый параллельный запуск попал в момент пересборки `webdist/dist`, поэтому `embed` временно не видел файлы.

## Откат

Откатить добавленные frontend editor logic/API wrappers/tests.
