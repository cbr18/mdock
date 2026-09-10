# Rendered Block Live Preview

Status: DONE
Created: 2026-08-16 20:04
Project: mdock
Plan: [16_08_2026_20_04_rendered_block_live_preview.md](../plans/16_08_2026_20_04_rendered_block_live_preview.md)

## Проблема

Текущий live preview скрывает часть Markdown-маркеров, но заголовки, таблицы и списки всё ещё ощущаются как plain text. Пользователь требует, чтобы элементы в `Просмотр + Редактирование` выглядели как в обычном режиме просмотра.

## Доказательства

- Пользователь проверил running UI и сообщил: `заголовки, таблицы, списки - все plain`.
- Текущая реализация использует line/inline decorations и не рендерит block-level HTML для таблиц, списков и сложных контейнеров.
- Официальная модель CommonMark делит Markdown на block structure и inline structure; GFM добавляет таблицы, task lists, strikethrough и autolinks.

## Нефункциональные ограничения

- Markdown остаётся единственным source of truth.
- Не добавлять новые зависимости.
- Переиспользовать существующий renderer: `react-markdown`, `remark-gfm`, `remark-frontmatter`, `rehype-highlight`.
- Не менять backend/API.
- Не менять `Исходник` и `Две панели`.
- Не ломать save/dirty/lock flow.
- Не хардкодить пользовательский текст без i18n там, где нужен label.

## Не входит в задачу

- Cell-level table editor.
- Click-to-toggle task checkbox без раскрытия source.
- Image/attachment API для реального предпросмотра локальных файлов.
- Obsidian graph/backlinks/autocomplete.
- Mermaid rendering.

## Желаемое поведение

- Неактивные Markdown-блоки в live editor заменяются rendered HTML widget, визуально совпадающим с `MarkdownPreview`.
- При клике на rendered block курсор ставится в исходный Markdown, widget исчезает, блок становится редактируемым source.
- Headings, paragraphs, lists, task lists, tables, blockquotes, code fences, thematic breaks, inline formatting, links и frontmatter выглядят как в режиме просмотра.
- Активный блок остаётся plain source для редактирования.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/features/editor/MarkdownEditor.jsx`
- `web/src/features/files/MarkdownPreview.jsx`
- `web/src/styles.css`
- `web/src/App.test.jsx`
- `web/src/setupTests.js`
- `docs/markdown_live_preview_coverage.md`

## Заметки по реализации

- Перевести live preview на `StateField<DecorationSet>` + `EditorView.decorations.from(field)`, чтобы block replace decorations могли менять вертикальную структуру документа.
- Парсить документ на блоки по CommonMark/GFM MVP правилам: frontmatter, fenced code, tables, lists, blockquotes, headings, setext headings, thematic breaks, paragraphs.
- Для каждого неактивного блока создавать `Decoration.replace({ block: true, widget })`.
- Widget рендерит `ReactMarkdown` с теми же plugins, что обычный preview.
- Widget click ставит selection в начало блока.

## Критерии приёмки

- Heading в live editor вне активного блока визуально совпадает с heading в preview.
- Table в live editor вне активного блока рендерится как HTML table.
- Bullet/ordered/task lists рендерятся как HTML lists/checkboxes.
- Blockquote/code fence/frontmatter/thematic break рендерятся как preview.
- Клик по rendered block раскрывает source.
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
- Playwright MCP manual check on `http://127.0.0.1:18081/?page=vault&slug=admin` — passed: live editor contains rendered `h1`, `table`, `ul`, task checkboxes, `blockquote`, `pre code`, `hr`; click on rendered heading reveals Markdown source.
- Commit: `29bb3b3`.
- Дополнительная стабилизация визуального паритета, высоты, клавиатуры и внешнего shell вынесена в задачу [21_08_2026_23_13_live_preview_height_keyboard.md](21_08_2026_23_13_live_preview_height_keyboard.md).

## Откат

Вернуть предыдущую active-line implementation в `livePreviewExtension`, связанные CSS и тестовые ожидания.
