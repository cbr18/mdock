# Live preview remeasure after activation

Status: DONE
Created: 2026-08-22 13:11
Project: mdock
Plan: [22_08_2026_13_11_live_preview_remeasure_after_activation.md](../plans/22_08_2026_13_11_live_preview_remeasure_after_activation.md)
Commits:
- `54b21c5` — `fix: place live preview cursor from DOM caret`

## Проблема

После правки CSS курсор в active live preview block всё ещё переносится неточно: пользователь кликает внутри блока, а позиция курсора оказывается ниже ожидаемой.

## Доказательства

- Пользователь сообщил после предыдущей правки: "не помогло!"
- Live preview заменяет rendered widget на реальные source lines через CodeMirror decorations.
- После такой замены CodeMirror может использовать stale height/coordinate map до следующего собственного measurement cycle.

## Нефункциональные ограничения

- Не ломать поведение: повторный click внутри active block не должен закрывать блок.
- Не менять backend/API/WebDAV.
- Не делать полный WYSIWYG.
- Не менять test stack command/port.

## Не входит в задачу

- Toolbar-команды.
- Полная переработка live preview.
- Редактирование rendered HTML напрямую.

## Желаемое поведение

- После первого click по rendered block CodeMirror переизмеряет layout активных source lines.
- Следующий click внутри active block использует актуальные координаты строк.
- Cursor не уезжает ниже точки клика из-за stale measurement.
- Click внутри active source line ставит cursor через реальный DOM caret этой строки, а не только через CodeMirror height map.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/features/editor/livePreviewExtension.test.js` при необходимости
- `tasks/`
- `plans/`

## Заметки по реализации

- После dispatch `setActiveBlock` вызвать `view.requestMeasure()` на следующем animation frame.
- Сделать это в обоих widget paths: full-document widget и per-block widget.
- Сохранить `view.focus()` после активации блока.
- Для active source line добавить `data-live-line-from` и перехват `mousedown`.
- На `mousedown` внутри active source line использовать DOM caret (`caretPositionFromPoint`/`caretRangeFromPoint`) и `view.posAtDOM`, затем clamp в текущую строку.

## Критерии приёмки

- `npm test` проходит.
- `npm run build` проходит.
- `go test ./...` проходит.
- Test stack пересобран стандартной командой.
- Smoke зелёный.
- Headless Chromium сценарий показывает, что после активации list block есть active source lines и повторный click не возвращает rendered block.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: после activation dispatch вызывается deferred `view.requestMeasure()`.
- Реализовано: active source line получает `data-live-line-from`.
- Реализовано: `mousedown` внутри active source line ставит selection через DOM caret + `view.posAtDOM`, с clamp в clicked line.
- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium проверка: click по второй active list line дал `cursorLine: 1`, active lines = 3, rendered list = 0.

## Откат

Откатить remeasure hook в live preview extension. Данные хранилищ не менять.
