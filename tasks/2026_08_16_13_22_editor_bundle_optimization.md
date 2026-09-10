# Editor bundle optimization

Status: DONE
Created: 2026-08-16 13:22
Project: mdock
Plan: [16_08_2026_13_22_editor_bundle_optimization.md](../plans/16_08_2026_13_22_editor_bundle_optimization.md)

## Проблема

После подключения CodeMirror editor production build начал создавать десятки language chunks и крупный основной JS chunk из-за импорта `@codemirror/language-data`.

## Доказательства

- `npm run build` показывает множество chunks вроде `python`, `ruby`, `sql`, `clike`, `dist-*`.
- `web/src/features/editor/MarkdownEditor.jsx` импортирует `languages` из `@codemirror/language-data`.
- Для mdock source editor достаточно Markdown syntax highlighting; fenced code preview уже подсвечивается через `rehype-highlight`.

## Нефункциональные ограничения

- Не ломать Markdown source editing.
- Не добавлять новые зависимости.
- Не ухудшать Obsidian source compatibility.
- Сохранить preview syntax highlight.

## Не входит в задачу

- Полная code splitting стратегия.
- Lazy route loading.
- Оптимизация `rehype-highlight`.

## Желаемое поведение

- CodeMirror editor не импортирует весь набор языков.
- Build перестаёт создавать десятки CodeMirror language chunks.
- Tests/build/go tests проходят.

## Затронутые области

- `web/src/features/editor/MarkdownEditor.jsx`
- `web/package.json`
- `web/package-lock.json`

## Заметки по реализации

- Убрать `codeLanguages: languages` из CodeMirror markdown extension.
- Удалить прямую dependency `@codemirror/language-data`, если больше не используется.

## Критерии приёмки

- `rg "language-data" web/src web/package.json` не находит usage.
- `npm run build` не создаёт десятки language chunks.
- `npm test`, `npm run build`, `go test ./...` проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`

## Результаты валидации

- `rg "language-data|codeLanguages" web/src web/package.json web/package-lock.json` — no matches.
- `npm test` в `web/` — passed, 22 tests.
- `npm run build` в `web/` — passed без Vite chunk warning.
- Итоговые chunks: initial `index` около `210.62 kB` raw / `67.10 kB` gzip, `VaultPage` около `346.20 kB` raw / `106.67 kB` gzip, editor chunks split ниже `500 kB`.
- `go test ./...` — passed.

## Откат

Вернуть import `@codemirror/language-data`, dependency и `codeLanguages`.
