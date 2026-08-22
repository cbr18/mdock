# Live preview cursor alignment

Status: DONE
Created: 2026-08-22 13:04
Project: mdock
Plan: [22_08_2026_13_04_live_preview_cursor_alignment.md](../plans/22_08_2026_13_04_live_preview_cursor_alignment.md)
Commits:
- `ca9c4b2` — `fix: align live preview cursor lines`

## Проблема

После фикса удержания active block повторный click внутри блока больше не закрывает блок, но курсор ставится неточно: визуально позиция оказывается чуть ниже точки клика.

## Доказательства

- Пользователь сообщил: "курсор переносится неточно, чуть ниже курсора".
- В live preview active source lines стилизованы фиксированным `line-height: 28px`, `min-height: 28px`, while CodeMirror рассчитывает координаты cursor/selection по собственной DOM-геометрии строк.
- Любое расхождение line box, padding и cursor measurement в CodeMirror даёт смещение click-to-position.

## Нефункциональные ограничения

- Не ломать предыдущий фикс: повторный click не должен закрывать active block.
- Не менять backend/API/WebDAV.
- Не менять общий layout vault page.
- Не делать полный WYSIWYG.

## Не входит в задачу

- Toolbar-команды.
- Полная переработка live preview.
- Редактирование rendered HTML напрямую.

## Желаемое поведение

- В active source block click ставит cursor на строку под указателем, без вертикального смещения вниз.
- Высота active source line должна совпадать с измеряемой CodeMirror line geometry.
- Повторный click внутри active block не возвращает rendered block.

## Затронутые области

- `web/src/styles.css`
- `web/src/features/editor/livePreviewExtension.js` при необходимости
- `web/src/features/editor/livePreviewExtension.test.js` при необходимости
- `tasks/`
- `plans/`

## Заметки по реализации

- Убрать фиксированный `line-height: 28px` для active source lines.
- Использовать normal line-height и vertical padding вместо искусственной высоты.
- Проверить, что list/table/code active lines не схлопываются.
- Проверить через headless Chromium, что click на active list line не переключает на соседнюю строку.

## Критерии приёмки

- `npm test` проходит.
- `npm run build` проходит.
- `go test ./...` проходит.
- Test stack пересобран стандартной командой.
- Smoke зелёный.
- Headless Chromium проверка показывает, что active block остаётся source после повторного click.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: active source lines больше не используют искусственный `line-height: 28px`.
- Реализовано: active source lines используют normal CodeMirror-compatible line box: `line-height: 1.6`, `padding: 2px 10px`, `min-height: 0`.
- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium проверка: active list lines имеют высоту около `26.39px`, `line-height: 22.4px`, повторный click оставляет active lines = 3 и rendered list = 0.

## Откат

Откатить CSS/extension изменения live preview. Данные хранилищ не менять.
