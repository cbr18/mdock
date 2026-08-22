# Live preview reclick keeps active block

Status: DONE
Created: 2026-08-22 12:42
Project: mdock
Plan: [22_08_2026_12_42_live_preview_reclick_keeps_block.md](../plans/22_08_2026_12_42_live_preview_reclick_keeps_block.md)

## Проблема

В live preview пользователь кликает по rendered list block один раз, блок переходит в исходник для редактирования. После второго клика по этому же блоку, чтобы поставить курсор, блок выходит из режима редактирования и снова становится rendered.

## Доказательства

- Пользователь сообщил: "я тыкаю на список один раз чтобы изменился вид на редактирование, потом второй раз чтобы переместить курсор, редактирование после второго раза с блока слетает".
- В `livePreviewExtension` active block сбрасывается при selection transaction, если helper считает, что selection не пересекает active block.
- Для многострочных Markdown-блоков list/table/blockquote это условие может быть слишком хрупким на повторном клике.

## Нефункциональные ограничения

- Не менять общую модель live preview.
- Не трогать backend/API/WebDAV.
- Не менять toolbar behavior.
- Не ломать ArrowUp/ArrowDown fixes.
- Не запускать альтернативные test stack команды.

## Не входит в задачу

- Полный WYSIWYG.
- Реализация toolbar-команд.
- Drag/drop файлов.
- Server drafts.

## Желаемое поведение

- Первый click по rendered block активирует source editing для этого блока.
- Повторный click внутри активного блока только двигает курсор.
- Активный блок сбрасывается только при явном уходе selection в другой блок.
- Списки, таблицы и обычные параграфы ведут себя одинаково.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/features/editor/livePreviewExtension.test.js` при добавлении focused tests
- `tasks/`
- `plans/`

## Заметки по реализации

- Проверить active block lifecycle внутри `StateField.update`.
- Сделать selection intersection устойчивым к cursor positions на границах строк active block.
- Если нужно, использовать source range активного блока вместо rendered/replaced range для проверки.
- Добавить тест на list block: activate, then selection inside same list line must keep source visible.

## Критерии приёмки

- Есть тест на повторную selection внутри active list block.
- Есть тест, что selection в другой блок всё ещё сбрасывает активный list block.
- `npm test` проходит.
- `npm run build` проходит.
- Test stack пересобран стандартной командой и smoke зелёный.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: active block больше не сбрасывается от обычного selection/cursor movement внутри CodeMirror.
- Реализовано: active block переключается explicit-кликом по другому rendered block через `setActiveBlock`.
- Реализовано: active range хранит `sourceTo`, чтобы отличать исходный Markdown-диапазон от absorbed separator range.
- Добавлены focused tests для list block ranges и explicit block switching assumptions.
- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium проверка на `live-preview-check.md`: после первого клика по rendered list active lines = 3, после второго клика внутри source block active lines = 3, rendered list не вернулся.

## Откат

Откатить изменения live preview extension и тесты. Данные хранилищ не менять.
