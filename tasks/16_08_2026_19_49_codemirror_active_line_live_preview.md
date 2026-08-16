# CodeMirror Active-Line Live Preview

Status: DONE
Created: 2026-08-16 19:49
Project: mdock
Plan: [16_08_2026_19_49_codemirror_active_line_live_preview.md](../plans/16_08_2026_19_49_codemirror_active_line_live_preview.md)

## Проблема

Текущий режим `Просмотр + Редактирование` технически открывает CodeMirror, но визуально остаётся plain Markdown с лёгкой подсветкой. Пользователь ожидает Obsidian-like Live Preview: документ вне активной строки должен выглядеть как обычный просмотр, а Markdown-синтаксис должен раскрываться только там, где пользователь редактирует.

## Доказательства

- Пользователь проверил running test stack и сообщил, что при галке `Редактировать` появляется plain-текст.
- Текущий `livePreviewExtension` использует mark decorations и opacity для markers, но не скрывает/заменяет служебный Markdown-синтаксис.

## Нефункциональные ограничения

- Markdown остаётся единственным source of truth.
- Не внедрять ProseMirror/TipTap/contenteditable.
- Не менять поведение вкладок `Исходник` и `Две панели`.
- Не ломать save/dirty/lock flow.
- Не добавлять новые зависимости.
- Не менять API и backend.
- Использовать глобальные theme tokens и i18n-подход проекта.

## Не входит в задачу

- Полноценное cell-level редактирование таблиц.
- Полноценный render изображений/embeds через attachment API.
- Wikilink navigation/autocomplete.
- Mermaid/backlinks/graph features.
- Click-to-toggle checkbox без раскрытия Markdown.

## Желаемое поведение

- `Просмотр + Редактирование` визуально ближе к обычному `Просмотр`.
- Активная строка и выделение показывают Markdown source для предсказуемого редактирования.
- Неактивные строки скрывают служебные markers у headings, inline formatting, links, wikilinks, lists, task lists, blockquotes, fenced code и frontmatter.
- Task list marker заменяется checkbox widget.
- Horizontal rule заменяется визуальной линией.
- Code fence markers скрыты, code block выглядит как блок кода.
- Frontmatter выглядит как metadata block, но раскрывается как source при редактировании.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/styles.css`
- `web/src/App.test.jsx`

## Заметки по реализации

- Использовать `Decoration.replace` для скрытия syntax ranges.
- Использовать `WidgetType` для checkbox и horizontal rule.
- Строить decorations по visible ranges.
- Вычислять active lines по selection ranges.
- Не применять replacement decorations на active lines.
- Избегать block widgets, которые меняют вертикальную структуру документа через viewport-only decorations.

## Критерии приёмки

- Неактивный heading не показывает `#`, но выглядит как heading.
- Активный heading показывает `#`.
- Неактивные inline markers `**`, `*`, `~~`, `==`, backticks скрыты.
- Markdown link показывает только label вне активной строки.
- Wikilink показывает только label/alias вне активной строки.
- Task list показывает checkbox widget вместо `- [x]`.
- Horizontal rule выглядит как линия.
- Frontmatter получает metadata styling.
- Unit tests/build/smoke проходят.
- Test stack пересобран на `http://127.0.0.1:18081`.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP ручная проверка running UI.

## Результаты валидации

- `npm test` — passed, 3 files / 22 tests.
- `npm run build` — passed.
- `go test ./...` — passed.
- `cd test && docker compose up -d --build` — passed, test stack rebuilt.
- `./test/run-smoke.sh` — passed.
- Playwright MCP manual check on `http://127.0.0.1:18081/?page=vault&slug=admin` — passed: live preview editor contains heading/inline/link/wikilink/task/frontmatter/code/table/horizontal-rule classes/widgets, and inactive Markdown markers are hidden in rendered edit mode.
- Commit: pending.

## Откат

Откатить изменения в `livePreviewExtension.js`, CSS live preview styles и тесты этой задачи.
