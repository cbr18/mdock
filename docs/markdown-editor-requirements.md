# Markdown editor requirements

Status: v1 IMPLEMENTED (2026-09-10)
Updated: 2026-09-10

## Цель

Веб-редактор mdock должен сохранять файлы в обычном Markdown source формате, который открывается в Obsidian без конвертации, скрытой сериализации и потери синтаксиса. Интерфейс может быть богаче обычного textarea, но итоговый артефакт всегда остаётся `.md` файлом в vault.

## Источники

- CommonMark Spec, latest 0.31.2: <https://spec.commonmark.org/>
- GitHub Flavored Markdown Spec 0.29-gfm: <https://github.github.com/gfm/>
- Obsidian Basic formatting syntax: <https://obsidian.md/help/syntax>
- Obsidian Advanced formatting syntax: <https://obsidian.md/help/advanced-syntax>
- Obsidian Flavored Markdown: <https://obsidian.md/help/obsidian-flavored-markdown>
- Obsidian Properties: <https://obsidian.md/help/properties>

## Базовое решение

- Canonical storage: plain UTF-8 Markdown file.
- Editor engine: CodeMirror 6 Markdown source editor.
- Preview: отдельная render-панель рядом с source, без WYSIWYG-сериализации.
- Toolbar actions: чистые текстовые трансформации выделения/строк.
- Compatibility target: Obsidian source mode в первую очередь; rendered preview приближаем постепенно.

## Совместимость с Obsidian

Obsidian официально использует смесь CommonMark, GitHub Flavored Markdown и LaTeX, а также поддерживает собственные расширения: wikilinks, embeds, block references, comments, highlights, callouts, footnotes, task lists и tables.

Для MVP редактирования важно не ломать расширения, даже если preview пока умеет рендерить не всё. Поэтому правило такое:

- Unknown/unsupported syntax must be preserved byte-for-byte by editor transforms unless the command explicitly targets that syntax.
- Toolbar commands must operate only on current selection or current block.
- Commands must avoid normalizing the whole document.
- Save must write exactly current editor text.

## Таблица действий редактора

| Группа | Действие | Markdown output | Source | MVP | Примечания |
| --- | --- | --- | --- | --- | --- |
| Текст | Абзац | plain text separated by blank lines | CommonMark | Да | Команда снимает heading/list/quote marker только с текущих строк. |
| Текст | Heading 1-6 | `#` ... `######` | CommonMark / Obsidian | Да | Переключение уровня через dropdown "Абзац". |
| Текст | Bold | `**text**` | CommonMark | Да | Toggle вокруг выделения или word at cursor. |
| Текст | Italic | `*text*` | CommonMark | Да | Не трогать `_` внутри слов. |
| Текст | Bold italic | `***text***` | CommonMark | Да | Отдельная команда в меню форматирования. |
| Текст | Strikethrough | `~~text~~` | GFM / Obsidian | Да | Toggle marker. |
| Текст | Highlight | `==text==` | Obsidian | Да | Preview поддержать отдельным remark plugin позже, source сохранить сразу. |
| Текст | Inline code | `` `code` `` | CommonMark | Да | Если внутри есть backtick, использовать double backticks. |
| Блок | Blockquote | `> text` | CommonMark | Да | Toggle на выбранных строках. |
| Блок | Callout | `> [!note]` | Obsidian | Да | Insert template; типы: note, info, tip, warning, danger, success, question. |
| Блок | Horizontal rule | `---` / `***` | CommonMark | Да | Вставка отдельной строкой. |
| Списки | Bullet list | `- item` | CommonMark / Obsidian | Да | Toggle на выбранных строках. |
| Списки | Ordered list | `1. item` | CommonMark / Obsidian | Да | При создании нумеровать строки. |
| Списки | Task list | `- [ ] item` | GFM / Obsidian | Да | Toggle checkbox marker. |
| Списки | Toggle task done | `- [x] item` | GFM / Obsidian | Да | Только для task list строк. |
| Списки | Indent/unindent list | leading spaces | CommonMark / Obsidian | Да | Tab/Shift+Tab и кнопки. |
| Code | Fenced code block | triple backticks | CommonMark / Obsidian | Да | Dropdown language optional. |
| Code | Syntax language | ```js | Obsidian uses Prism in reading view | Да | Сохраняем lang id, preview уже подсвечивает через rehype-highlight. |
| Links | External link | `[text](https://...)` | CommonMark | Да | Popover URL + label. |
| Links | Image URL | `![alt](https://...)` | CommonMark / Obsidian | Да | Width syntax `|100` отдельной командой позже. |
| Links | Wikilink | `[[Page]]` | Obsidian | Да | Insert command; preview/backlinks не обязательны в этой задаче. |
| Links | Wikilink alias | `[[Page\|Alias]]` | Obsidian | Да | Popover target + alias. |
| Links | Embed | `![[File.png]]` | Obsidian | Да | Insert/preserve; preview можно не делать сразу. |
| Links | Heading/block link | `[[Page#Heading]]`, `[[Page#^id]]` | Obsidian | Позже | Требует индекса headings/block ids. |
| Tables | Insert table | pipe table | GFM / Obsidian | Да | Начать с 2x2 template. |
| Tables | Add/remove row/column | pipe table transform | GFM / Obsidian | Позже | Нужен table parser, чтобы не ломать escaped `\|`. |
| Tables | Align column | `:--`, `:--:`, `--:` | GFM / Obsidian | Позже | В MVP можно вставить template с alignment вручную. |
| Math | Inline math | `$x$` | Obsidian / LaTeX | Да | Source command; preview позже через MathJax/KaTeX. |
| Math | Block math | `$$...$$` | Obsidian / LaTeX | Да | Insert template. |
| Metadata | YAML properties | `--- ... ---` | Obsidian Properties | Да | Source insert/update helper, без формы properties в MVP. |
| Metadata | tags/aliases/cssclasses | YAML properties | Obsidian | Да | Preserve as YAML. |
| Notes | Footnote ref | `[^id]` | Obsidian / Markdown extension | Да | Insert reference and definition template. |
| Notes | Inline footnote | `^[text]` | Obsidian | Да | Reading view only in Obsidian; source-compatible. |
| Notes | Comment | `%% text %%` | Obsidian | Да | Toggle selection. |
| Notes | Block id | `^id` | Obsidian | Позже | Требует генерации уникальных ids. |
| HTML | Raw HTML | `<div>...</div>` | CommonMark / GFM | Preserve | Не генерируем в toolbar, но не ломаем. |
| Mermaid | Diagram | fenced `mermaid` block | Obsidian | Позже | Toolbar может вставить code fence, preview позже. |

## Toolbar groups

- Paragraph: paragraph, H1-H6, quote, callout, code block.
- Inline: bold, italic, strikethrough, highlight, inline code, comment.
- Lists: bullet, ordered, task, indent, outdent.
- Insert: link, wikilink, image/embed, table, horizontal rule, footnote, math.
- View: rendered, source, split.
- File: save, lock status, reload/discard local changes.

## Lock/save requirements

- Opening editable `.md` file requests explicit web lock.
- While file is open, client sends heartbeat before TTL expires.
- Save uses existing `PUT /api/vaults/{slug}/files/content`.
- Save errors:
  - `423 locked`: show conflict/locked state, do not overwrite local editor buffer.
  - `409 lock_not_owner`: show lost-lock state and offer reload.
  - `415 binary_file`: disable editor.
  - network/server errors: keep dirty buffer.
- Closing file, switching file, or unmounting page releases lock best-effort.
- Browser unload uses best-effort release only; TTL remains fallback.

## Security requirements

- Never render raw HTML unsanitized in preview.
- Toolbar popovers must not inject HTML; all commands operate on text.
- File paths remain server-validated; client treats path as data.
- Do not log file content, session cookies, auth headers or setup tokens.
- Save must rely on existing CSRF/session mechanisms.

## MVP acceptance

- Пользователь может открыть `.md`, получить lock, изменить текст, сохранить и увидеть обновлённый preview.
- После сохранения файл доступен через WebDAV/Obsidian как обычный Markdown.
- Toolbar commands generate source Markdown listed as MVP in the table.
- Unsupported Obsidian syntax is preserved when editing around it.
- Tests cover text transforms, lock/save API wrapper and basic editor workflow.

---

## v1 Implementation Status (2026-09-10)

| Feature | Status | Notes |
|---|---|---|
| Live edit (Preview + Edit) | ✅ Done | Click-to-edit, inline source, cursor at click pos |
| Hard line breaks | ✅ Done | `remark-breaks` + GFM `breaks:true` |
| Lock/heartbeat | ✅ Done | Single-flight, visibility recovery, idle timeout |
| Draft storage | ✅ Done | localStorage + history (10 versions), auto-draft on 409/423 |
| Conflict dialog | ✅ Done | "Перечитать с сервера" / "Продолжить с черновиком" |
| Keyboard shortcuts | ✅ Done | Ctrl+S/Z/Y/A |
| Mode switching | ✅ Done | Preview/Source/Split без потери контента |
| Height consistency | ✅ Done | CSS font/line-height matching |

| Deferred Feature | Status |
|---|---|
| Draft history UI page | Deferred (data structure ready) |
| Structural Backspace (list/blockquote) | Deferred |
| Multi-block selection ops | Deferred |
| Cell-level table editor | Deferred |
| Wikilinks / embeds / callouts / Mermaid | Next task |
| Server-side diff/merge | Next task |

---

## Known Issues

- 2 pre-existing test failures in `App.test.jsx` (unrelated to v1 changes)
- Large doc performance: consider debounce + viewport rendering
- Multi-tab UX: show "File opened in another tab" on 423
