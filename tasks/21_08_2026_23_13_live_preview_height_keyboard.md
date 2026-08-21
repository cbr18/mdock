# Live Preview Height And Keyboard Navigation

Status: DONE
Created: 2026-08-21 23:13
Project: mdock
Plan: [21_08_2026_23_13_live_preview_height_keyboard.md](../plans/21_08_2026_23_13_live_preview_height_keyboard.md)

## Проблема

В live editor блоки выглядят лучше, но высоты/отступы неровные, а навигация клавиатурой работает некорректно: `ArrowDown` сдвигает курсор на одну строку, а `ArrowUp` переносит в начало документа.

## Доказательства

- Пользователь проверил running UI и сообщил о неровной высоте и неправильной навигации `ArrowUp`.
- Текущий live preview использует rendered block widgets, из-за чего стандартная визуальная навигация CodeMirror может опираться на геометрию widgets.

## Нефункциональные ограничения

- Не менять backend/API.
- Не менять поведение `Исходник` и `Две панели`.
- Не добавлять зависимости.
- Не трогать чужие untracked/debug файлы и package changes в рабочей копии.
- Сохранять rendered-block подход для live preview.

## Не входит в задачу

- Полный Obsidian parser.
- Cell-level table editor.
- Переработка всей темы редактора.
- Push/deploy.

## Желаемое поведение

- Rendered blocks в live editor стоят ровно в документном потоке без лишних вертикальных провалов.
- Source lines и active source line имеют стабильный базовый line-height.
- `ArrowDown` двигает курсор на следующую Markdown-строку.
- `ArrowUp` двигает курсор на предыдущую Markdown-строку, а не в начало документа.
- Горизонтальная позиция курсора по возможности сохраняется.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/styles.css`
- `web/src/App.test.jsx`

## Заметки по реализации

- Добавить `keymap.of` в `livePreviewExtension`.
- Реализовать custom commands для `ArrowUp`/`ArrowDown` через `state.doc.lineAt`.
- Навигация должна работать по логическим Markdown-строкам, потому что rendered widgets ломают визуальную геометрию.
- Сжать CSS margins внутри `.cm-live-rendered-block`, чтобы rendered preview был ровнее в CodeMirror-потоке.

## Критерии приёмки

- Unit tests проверяют rendered live blocks.
- `npm test` и `npm run build` проходят.
- Test stack пересобран на `http://127.0.0.1:18081`.
- Playwright MCP проверяет наличие rendered blocks и отсутствие грубого провала по высоте.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP ручная проверка live editor.

## Результаты валидации

- `npm test -- src/App.test.jsx src/features/editor/markdownActions.test.js src/features/editor/fileEditorSession.test.js` — passed, 3 files / 22 tests.
- `npm run build` — passed.
- `go test ./...` — passed.
- `cd test && docker compose up -d --build` — passed, only test stack started.
- `./test/run-smoke.sh` — passed.
- `docker ps` — only `mdock:test` is running on `http://127.0.0.1:18081`.
- Playwright MCP manual check — passed: baseline source line height is 24px, table is recognized as rendered table, rendered block gaps are reduced to the live preview baseline, `ArrowDown` moves from heading to next Markdown block, `ArrowUp` returns to heading instead of document start.
- Full `npm test` was not used as final validation because unrelated untracked Playwright debug specs in `web/` are currently picked up by Vitest and fail outside this task.
- Commit: pending.

## Откат

Откатить keymap live navigation и CSS adjustments этой задачи.
