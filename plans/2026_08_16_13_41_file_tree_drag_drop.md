# File tree drag and drop

Task: [16_08_2026_13_41_file_tree_drag_drop.md](../tasks/16_08_2026_13_41_file_tree_drag_drop.md)

## Последовательность реализации

1. Подключить `movePath` в file tree panel.
2. Добавить состояние dragged entry, active drop target и pending move fallback.
3. Реализовать проверку запретов: no-op move, move folder into itself/descendant.
4. Реализовать общий handler move, который вызывает `movePath` и обновляет source/target directories.
5. Добавить native drag-and-drop на строки и drop target на папки/pathbar.
6. Добавить keyboard/touch fallback: "переместить" у строки и "переместить сюда" у папки/pathbar.
7. Добавить i18n и стили подсветки drop target.
8. Покрыть тестами successful move и forbidden folder move.
9. Прогнать проверки и smoke.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP ручная проверка drag/fallback.

## Риски

- Drag-and-drop без доступного fallback ухудшит UX.
- Directory move может случайно привести к потере ориентации пользователя.
- Browser DnD в unit tests ограничен, поэтому основной unit-путь проверять через общий move handler/fallback, а живой DnD проверить Playwright MCP.

## Заметки по откату

Откатить frontend changes и task/plan. Backend/data не трогать.
