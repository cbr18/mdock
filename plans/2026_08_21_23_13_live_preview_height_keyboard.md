# Live Preview Height And Keyboard Navigation

Task: [21_08_2026_23_13_live_preview_height_keyboard.md](../tasks/21_08_2026_23_13_live_preview_height_keyboard.md)

## Последовательность реализации

1. Зафиксировать regression case по скриншотам `скрины/просмотр.png` и `скрины/редактирование.png`.
2. Добавить Playwright-проверку visual parity до правок: сравнить режим `Просмотр` и live edit по `boundingBox` для frontmatter, heading, paragraph, blockquote, list, table, code.
3. Убрать raw frontmatter на первом открытии live edit: active raw block должен появляться только после явного пользовательского действия.
4. Выровнять content model live edit с `.markdown-preview`: левый край, ширина, padding, margin.
5. Убрать лишние вертикальные провалы между rendered widgets и blank/source placeholders.
6. Привести quote/list/task-list/table/code styles в live edit к обычному preview.
7. Сохранить и перепроверить custom navigation для `ArrowUp`/`ArrowDown`.
8. Прогнать unit/build/backend/smoke проверки и пересобрать test stack.
9. Проверить UI через Playwright MCP со скриншотами до/после и записать результаты в task.
10. Обновить task validation и сделать commit после успешной проверки.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright visual parity check: `Просмотр` vs live edit, `boundingBox` и screenshots.

## Риски

- Логическая навигация по Markdown-строкам может отличаться от визуальной навигации внутри многострочного rendered paragraph, но она предсказуема и не зависит от DOM geometry widgets.
- Полностью одинаковая высота для headings/tables может потребовать decouple active raw block от rendered preview: обычное состояние должно быть визуально как preview, raw source только для активного блока.
- Сравнение screenshots может быть шумным из-за шрифтов и subpixel rendering, поэтому основной automated assertion должен опираться на `boundingBox`, а screenshots использовать как артефакт ручной проверки.
- Удаление blank placeholders может повлиять на mapping позиции CodeMirror -> Markdown line; после CSS/DOM правок обязательно повторить keyboard navigation checks.

## Заметки по откату

Удалить custom keymap и вернуть предыдущие CSS значения live preview.
