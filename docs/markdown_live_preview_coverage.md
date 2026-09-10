# Markdown Live Preview Coverage

Status: MVP coverage after rendered block live preview.
Completed: 2026-09-10

## Источники

- CommonMark Spec 0.31.2: https://spec.commonmark.org/spec
- GitHub Flavored Markdown Spec 0.29-gfm: https://github.github.com/gfm/
- GitHub tables guide: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables

## Реализованные фичи (v1)

### Режимы
- **Вкладка "Просмотр" + галочка "Редактирование"** — live edit: rendered блоки, клик → inline source editing
- **Вкладка "Источник"** — чистый CodeMirror редактор исходного Markdown
- **Вкладка "Разделено"** — source слева, preview справа (live edit не применяется)

### Pipeline
- `react-markdown` + `remark-gfm` + `remark-frontmatter` + `rehype-highlight` + `remark-breaks`
- `remark-gfm` с `breaks: true` + `remark-breaks` → hard line breaks (одиночные `\n` → `<br>`)

### Lock & Concurrency
- File lock при открытии для редактирования (acquire/heartbeat/release)
- Single-flight heartbeat (предотвращает наложение запросов)
- Visibility/focus recovery (проверка lock при возврате вкладки)
- Idle timeout: 30 мин неактивности → warning → 2 мин → автозакрытие

### Draft & Conflict
- localStorage draft storage: `mdock.draft.{vaultSlug}.{filePath}`
- History: 10 последних версий на документ
- Auto-draft при 409/423 Conflict
- Conflict dialog: "Перечитать с сервера" / "Продолжить с черновиком"
- Draft recovery при повторном открытии (< 24h)

### Keyboard
- Ctrl/Cmd+S — save
- Ctrl/Cmd+Z — undo (word-level)
- Ctrl/Cmd+Y / Shift+Ctrl/Cmd+Z — redo
- Ctrl/Cmd+A — select all

## CommonMark

| Элемент | Spec section | Live preview |
| --- | --- | --- |
| Thematic breaks | 4.1 | Rendered через `ReactMarkdown`, клик раскрывает source |
| ATX headings | 4.2 | Rendered как `h1`-`h6`, клик раскрывает source |
| Setext headings | 4.3 | Rendered как heading block, клик раскрывает source |
| Indented code blocks | 4.4 | Rendered renderer-ом внутри paragraph/list contexts, отдельный splitter MVP ограничен |
| Fenced code blocks | 4.5 | Rendered как `pre code` с `rehype-highlight`, клик раскрывает source |
| HTML blocks | 4.6 | Передаются renderer-у; sanitize policy не расширялась в этой задаче |
| Link reference definitions | 4.7 | Поддерживаются renderer-ом внутри блока |
| Paragraphs | 4.8 | Rendered как `p`, клик раскрывает source |
| Blank lines | 4.9 | Используются splitter-ом как границы блоков |
| Block quotes | 5.1 | Rendered как `blockquote`, клик раскрывает source |
| List items | 5.2 | Rendered через renderer как `ul`/`ol`, клик раскрывает source |
| Lists | 5.3 CommonMark / 5.4 GFM | Rendered как `ul`/`ol`, вложенные списки отдаём renderer-у |
| Code spans | 6.1 CommonMark / 6.3 GFM | Rendered как inline `code` внутри block widget |
| Emphasis / strong | 6.2 CommonMark / 6.4 GFM | Rendered как `em`/`strong` |
| Links | 6.3 CommonMark / 6.6 GFM | Rendered как `a` |
| Images | 6.4 CommonMark / 6.7 GFM | Renderer создаёт `img`, но локальные vault attachment URLs требуют отдельного API |
| Autolinks | 6.5 CommonMark / 6.8 GFM | Rendered renderer-ом |
| Raw HTML | 6.6 CommonMark / 6.10 GFM | Передаётся renderer policy текущего preview |
| Hard / soft line breaks | 6.7 / 6.8 CommonMark | **Hard breaks: одиночные `\n` → `<br>` (remark-breaks + GFM breaks:true)** |

## GFM Extensions

| Элемент | Spec section | Live preview |
| --- | --- | --- |
| Tables | 4.10 | Rendered как HTML `table` |
| Task list items | 5.3 | Rendered как checkbox inputs |
| Strikethrough | 6.5 | Rendered через `remark-gfm` |
| Autolinks extension | 6.9 | Rendered через `remark-gfm` |
| Disallowed raw HTML | 6.11 | Не расширялось; соответствует текущему preview pipeline |

## Obsidian Extensions (Deferred)

Эти элементы не входят в CommonMark/GFM и не закрываются текущей задачей:

| Элемент | Live preview сейчас | Что нужно отдельно |
| --- | --- | --- |
| `==highlight==` | Остаётся текстом | Remark plugin/preprocessor для Obsidian highlight |
| `[[wikilink]]` / `[[page\|alias]]` | Остаётся текстом | Parser + link resolver по vault tree |
| `![[embed]]` | Остаётся текстом/обычным markdown content | Attachment API + embed renderer |
| Callouts `> [!note]` | Сейчас рендерятся как обычный blockquote | Obsidian callout transform |
| Mermaid | Не рендерится | Mermaid dependency/sandbox/render policy |
| Backlinks/graph | Не относятся к markdown rendering | Индексация vault links |

## Известные ограничения MVP

- Block splitter нужен для UX выбора rendered/source блока и не является полной CommonMark parser implementation.
- Сложные nested container edge cases отдаём renderer-у внутри выбранного блока, но границы блоков могут отличаться от полного CommonMark AST на экзотических документах.
- Таблицы рендерятся как preview, но cell-level редактирования пока нет: клик раскрывает Markdown source всей таблицы.
- Task checkbox пока rendered-only: клик раскрывает source, прямой toggle checkbox не меняет Markdown.
- **Structural Backspace** (выход из вложенности списка/blockquote при пустом selection) — не реализован.
- **Multi-block selection операции** (cut/copy/paste по нескольким блокам) — базовый CM6 работает, специальная обработка не добавлена.
- **Draft history UI page** — структура данных есть (`loadDraftHistory`, `listDrafts`), UI страница не реализована.
