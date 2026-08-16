# Rendered Block Live Preview

Task: [16_08_2026_20_04_rendered_block_live_preview.md](../tasks/16_08_2026_20_04_rendered_block_live_preview.md)

## Последовательность реализации

1. Экспортировать reusable preview plugins/helpers из `MarkdownPreview`.
2. Переписать `livePreviewExtension` на `StateField` с block replace widgets.
3. Добавить простой CommonMark/GFM block splitter для MVP supported blocks.
4. Реализовать ReactMarkdown widget, который рендерит block как preview и по клику раскрывает source.
5. Передать i18n label для frontmatter из `MarkdownEditor`.
6. Обновить CSS для `.cm-live-rendered-block` так, чтобы он наследовал preview styling.
7. Усилить tests: проверять настоящие `h1`, `table`, `ul`, `input[type=checkbox]` внутри live editor.
8. Прогнать проверки, пересобрать test stack, проверить Playwright MCP.
9. Обновить task validation и сделать commit.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Риски

- Block replace widgets меняют layout; поэтому нужен `StateField`, а не viewport-only ViewPlugin.
- Крупные документы будут требовать оптимизации parser-а, но MVP parser должен быть линейным.
- Полная CommonMark совместимость невозможна без полноценного parser AST; задача использует существующий renderer для block content и простой splitter для редакторского UX.

## Заметки по откату

Откатить block widgets и вернуть active-line decorations.
