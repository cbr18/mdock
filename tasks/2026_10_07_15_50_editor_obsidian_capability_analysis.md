Status: DONE
Plan: [2026_10_07_15_50_editor_obsidian_capability_analysis.md](../plans/2026_10_07_15_50_editor_obsidian_capability_analysis.md)

## Проблема

Текущий редактор покрывает базовый CommonMark/GFM и частично Obsidian extensions, но нет системного анализа:
- Что именно поддерживается / не поддерживается / частично поддерживается
- Как это рендерится в live preview vs source view vs split view
- Какие Obsidian-фичи критичны для пользователей vault
- Где разрывы UX при переключении режимов
- Какой backlog фич нужен для парности с Obsidian reading/editing experience

Без этого backlog формируется хаотично, риск упустить критичные фичи или дублировать работу.

## Доказательства

- `docs/markdown-editor-requirements.md` — таблица действий, но нет покрытия preview/rendering
- `docs/markdown_live_preview_coverage.md` — покрытие CommonMark/GFM, но Obsidian extensions = «Deferred» без деталей
- Нет матрицы: элемент синтаксиса × режим (source/live/split) × статус (edit/render/preview) × приоритет
- Не изучены: Mermaid, Canvas, Dataview, Datacore, плагины сообщества (Tasks, Kanban, Calendar)
- Не проанализированы: mobile UX, touch, accessibility в live preview

## Нефункциональные ограничения

- Анализ не должен блокировать текущую разработку (параллельный трек)
- Результат — документ-референс для планирования, не PRD
- Фокус на **Markdown source compatibility** (не WYSIWYG divergence)
- Учитывать: mdock = self-hosted, multi-user, WebDAV, Git sync — отличия от локального Obsidian

## Не входит в задачу

- Реализация фич — только анализ и приоритизация
- Дизайн UI для новых фич — отдельные задачи
- Серверная часть (индексация wikilinks, backlinks, graph) — отдельная задача

## Желаемое поведение

Два артефакта в `docs/`:

### 1. `docs/editor-obsidian-capability-matrix.md` — Большая таблица сравнения

Строки: каждый элемент синтаксиса/фичи (200+ строк)
Колонки:
| Категория | Элемент | Obsidian Syntax | CM6 Support | Live Preview Render | Source Edit | Split View | Mobile UX | A11y | Приоритет (P0/P1/P2) | Заметки / Зависимости |
|---|---|---|---|---|---|---|---|---|---|---|

Категории (группы строк):
- **Basics**: Paragraph, Hard/Soft breaks, Headings (ATX/Setext), Horizontal rule
- **Inline**: Bold, Italic, Strikethrough, Highlight, Inline code, Code span variations
- **Links**: External, Internal (wikilink `[[ ]]`), Alias `[[|]]`, Block ref `[[#^id]]`, Heading ref `[[#Heading]]`, Embed `![[ ]]`, URL autolinks
- **Images**: External URL, Vault attachment `![[image.png]]`, Width syntax `![[img\|100]]`, WebP/AVIF support
- **Lists**: Bullet, Ordered, Task (`- [ ]`), Task done (`- [x]`), Nested, Indent/Outdent, Start number
- **Blocks**: Blockquote, Callout `> [!type]`, Nested callouts, Callout fold, Collapsible `> [!NOTE]-`
- **Code**: Fenced (```lang), Indented, Inline, Syntax highlight (Prism/Shiki), Line numbers, Focus line, Copy button
- **Tables**: Pipe tables, Alignment, Headerless, Multi-line cells, Row/col span (GFM extension)
- **Math**: Inline `$ $`, Block `$$ $$`, LaTeX macros, MathJax/KaTeX rendering, Copy LaTeX
- **Metadata**: YAML frontmatter, Properties (Obsidian Properties UI), Tags, Aliases, CSS classes
- **Footnotes**: Reference `[^id]`, Inline `^[text]`, Hover preview, Backlink
- **Comments**: `%% comment %%`, Block comments
- **Diagrams**: Mermaid, PlantUML, GraphViz, Excalidraw embed
- **Embeds**: PDF, Video, Audio, IFrame, Excalidraw, Canvas
- **Advanced**: Block references `^id`, Transclusion `![[#^id]]`, Dataview queries, Datacore
- **Editing UX**: Live preview interaction, Source mode, Split view, Vim mode, Typewriter mode, Focus mode
- **Mobile**: Touch selection, Virtual keyboard, Toolbar, Gestures
- **Accessibility**: Screen reader, Keyboard nav, High contrast, Reduced motion

### 2. `docs/editor-backlog-prioritized.md` — Приоритизированный бэклог

Формат каждой фичи:
```markdown
## [P0] Wikilink `[[Page]]` — Source edit + Live preview render
**User story**: Как пользователь vault, я хочу создавать и кликать wikilinks в live preview, чтобы навигировать между заметками как в Obsidian.
**Current state**: В source mode работает (plain text). В live preview — рендерится как обычный текст, не кликабельно.
**Acceptance criteria**:
- [ ] Toolbar команда "Wikilink" вставляет `[[ ]]` с пикером страниц
- [ ] Live preview рендерит как ссылку с hover preview (title + first lines)
- [ ] Клик в live preview → навигация (или открытие в новой панели)
- [ ] Автодополнение при вводе `[[` в source и live режимах
**Dependencies**: Vault index API (search pages), Routing/navigation
**Effort**: M (2-3 недели)
**Risks**: Производительность индексации больших vaults
```

## Затронутые области

- `docs/` — два новых документа-референса
- `web/src/features/editor/` — только для аудита текущего кода (чтение)
- `web/src/features/files/MarkdownPreview.jsx` — аудит render pipeline
- `web/src/features/editor/livePreviewExtension.js` — аудит block splitter, widgets

## Заметки по реализации

1. **Методология**: 
   - Пройти по Obsidian Help (Basic + Advanced + Flavored Markdown + Properties)
   - Пройти по CommonMark 0.31.2 + GFM 0.29 spec
   - Протестировать каждый элемент в Obsidian v1.6+ (desktop + mobile)
   - Протестировать каждый элемент в текущем mdock (source / live / split)
   - Зафиксировать дельту

2. **Инструментарий**: 
   - Скрипт для генерации матрицы из структурированных данных (JSON/YAML → Markdown table)
   - Чек-лист для ручного тестирования (приложить к документу)

3. **Приоритизация** (RICE-like):
   - Reach: % пользователей, использующих фичу (оценка по issue tracker, форумам)
   - Impact: Насколько критично для «Obsidian-like» ощущения
   - Confidence: Насколько точно знаем effort
   - Effort: S/M/L/XL в инженерных неделях

4. **Выходные данные** используются для:
   - Планирования следующих кварталов
   - Оценки рисков миграции на ProseMirror/Lexical (еśli рассматривается)
   - Коммуникации с пользователями: «Что работает, что в планах, что не будет»

## Критерии приёмки

- [ ] `editor-obsidian-capability-matrix.md` — полная таблица 200+ строк, все колонки заполнены
- [ ] `editor-backlog-prioritized.md` — минимум 50 фич с P0/P1/P2, acceptance criteria, effort, risks
- [ ] Документы ревьючены командой (async), получен feedback
- [ ] Приоритеты согласованы с product owner / stakeholder
- [ ] Связано с существующими задачами в `tasks/` (cross-ref)

## План тестирования

Не применимо (аналитическая задача). Валидация — через ревью документов стейкхолдерами.

## Результаты валидации

(заполняется после завершения)

## Откат

Не требуется — артефакты документальные, не влияют на код.