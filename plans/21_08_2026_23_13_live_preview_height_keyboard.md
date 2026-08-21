# Live Preview Height And Keyboard Navigation

Task: [21_08_2026_23_13_live_preview_height_keyboard.md](../tasks/21_08_2026_23_13_live_preview_height_keyboard.md)

## Последовательность реализации

1. Добавить live preview keymap для `ArrowUp`/`ArrowDown`.
2. Реализовать перемещение по логическим строкам с сохранением колонки.
3. Подровнять CSS базовой line-height active/source строк и rendered widgets.
4. Обновить/добавить тесты на live rendered blocks без привязки к старым marker classes.
5. Прогнать проверки и пересобрать test stack.
6. Проверить UI через Playwright MCP.
7. Обновить task validation и сделать commit.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Риски

- Логическая навигация по Markdown-строкам может отличаться от визуальной навигации внутри многострочного rendered paragraph, но она предсказуема и не зависит от DOM geometry widgets.
- Полностью одинаковая высота для headings/tables невозможна без отказа от rendered preview; задача убирает лишние провалы и стабилизирует source line height.

## Заметки по откату

Удалить custom keymap и вернуть предыдущие CSS значения live preview.
