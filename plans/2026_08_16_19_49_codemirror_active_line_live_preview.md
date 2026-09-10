# CodeMirror Active-Line Live Preview

Task: [16_08_2026_19_49_codemirror_active_line_live_preview.md](../tasks/16_08_2026_19_49_codemirror_active_line_live_preview.md)

## Последовательность реализации

1. Переписать `livePreviewExtension` на active-line модель: selection-aware visible range decorations.
2. Добавить replacement helpers для скрытия syntax markers вне активной строки.
3. Реализовать line-level поведение для headings, blockquotes, lists, task lists, horizontal rules, fenced code и frontmatter.
4. Реализовать inline behavior для bold, italic, strike, highlight, inline code, markdown links и wikilinks.
5. Добавить widgets для checkbox и horizontal rule.
6. Обновить CSS, чтобы live editor выглядел ближе к rendered preview.
7. Обновить unit tests на скрытие markers и active-line раскрытие source.
8. Прогнать проверки и пересобрать test stack.
9. Проверить UI через Playwright MCP и закрыть task.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Риски

- Replace decorations могут влиять на caret UX, если применить их к активной строке.
- Regex-подход может ошибаться на сложном Markdown; задача закрывает MVP live behavior, не полный Markdown parser.
- Таблицы и media требуют отдельных API/UI решений для полного совпадения с rendered preview.

## Заметки по откату

Вернуть предыдущую версию `livePreviewExtension`, CSS markers styling и тестовые ожидания.
