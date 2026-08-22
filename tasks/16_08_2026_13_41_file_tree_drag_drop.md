# File tree drag and drop

Status: DONE
Created: 2026-08-16 13:41
Project: mdock
Plan: [16_08_2026_13_41_file_tree_drag_drop.md](../plans/16_08_2026_13_41_file_tree_drag_drop.md)

## Проблема

Нужно проработать возможность перетаскивать файл между папками в дереве хранилища.

## Доказательства

Пользователь написал: "и в идеале возможность перетаскивать файл между папками. но это потом (добавь задачу напиши что Я написал и укажи что ее надо дополнить)."

## Нефункциональные ограничения

- Не менять backend contract.
- Использовать существующий `movePath`.
- Не ломать locks и file API move semantics.
- Не делать silent overwrite: конфликт имён должен обрабатываться backend/API ошибкой и показываться пользователю как ошибка перемещения.
- Сохранить i18n RU/EN и theme tokens.

## Не входит в задачу

- Undo перемещения.
- Multi-select/bulk move.
- Rename при конфликте.
- Drag-and-drop между разными хранилищами.

## Желаемое поведение

- Файл или папку можно перетащить на папку в дереве.
- Файл или папку можно перетащить на pathbar root/current folder.
- Папку нельзя переместить в саму себя или в потомка.
- После успешного move обновляются source parent и target folder.
- Если перемещён выбранный файл, preview продолжает ссылаться на новый path.
- Для keyboard/touch fallback есть действие "переместить" у строки и "переместить сюда" у папки/pathbar.
- Для move использовать существующий `movePath`.

## Затронутые области

- `web/src/features/files/`
- `web/src/api/files.js`
- tests

## Заметки по реализации

- Native HTML drag-and-drop: `draggable`, `dragstart`, `dragover`, `drop`.
- Drop target подсвечивается классом.
- Fallback: pending move entry хранится в React state, кнопка "move here" вызывает тот же handler.
- Итоговый `toPath` строить как `targetFolder/name`.

## Критерии приёмки

- Drag файла в папку вызывает `movePath(slug, from, to)`.
- Drag папки в потомка запрещён до API-вызова.
- Fallback move через кнопки работает.
- После move дерево обновляется.
- Tests/build/smoke проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP проверка на test stack.

## Результаты валидации

- `npm test` из `web/`: 3 test files passed, 22 tests passed.
- `npm run build` из `web/`: production frontend build passed.
- `go test ./...`: passed.
- `cd test && docker compose up -d --build`: test stack rebuilt and started on canonical port 18081.
- `./test/run-smoke.sh`: passed.
- Playwright MCP на `http://127.0.0.1:18081/?page=vault&slug=admin`: проверены fallback move через кнопки, native drag-and-drop через `dragTo`, появление moved-файлов в target folder и cleanup временных `dnd-*` элементов.

## Откат

Откатить frontend changes и task/plan. Backend/data не трогать.
