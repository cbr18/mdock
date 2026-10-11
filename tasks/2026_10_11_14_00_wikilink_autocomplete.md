Status: CREATED
Plan: [2026_10_11_14_00_wikilink_autocomplete.md](../plans/2026_10_11_14_00_wikilink_autocomplete.md)

## Проблема

Реализовать P0-1 Wikilinks (создание `[[Page]]` ссылок) и P0-4 Wikilink Autocomplete (picker modal с fuzzy search) на базе готового Page Index API.

## Доказательства

- Page Index API готов: `SearchPageIndex` (FTS5 fuzzy search), `GetPageIndex`, `GetPageHeadings`
- В тулбаре есть кнопка "Wikilink", но она только вставляет `[[ ]]` без автодополнения
- Нет навигации по клику на wikilink в live preview
- Нет picker модалки для выбора страницы

## Нефункциональные ограничения

- Autocomplete должен срабатывать при вводе `[[` (debounce 150ms)
- Fuzzy search < 100ms на 10k+ заметках
- Picker должен открываться и по кнопке тулбара, и по вводу `[[`
- Навигация в live preview: Ctrl+Click или Cmd+Click → переход на страницу
- Не должно ломать существующий ввод wikilink вручную

## Не входит в задачу

- Heading/Block refs (`[[Page#Heading]]`, `[[Page#^block]]`) — P1-4
- Embeds (`![[File]]`) — P1-1
- Backlinks панель — P2

## Желаемое поведение

### 1. Wikilink Toolbar Button + Autocomplete

- Кнопка "Wikilink" в тулбаре открывает picker модалку
- При вводе `[[` в source/live режиме → открывается autocomplete
- Fuzzy search через `SearchPageIndex` (debounce 150ms, min 2 chars)
- Результаты: title, alias, path, preview (first 100 chars)
- Выбор → вставляет `[[Page]]` или `[[Page|Alias]]`
- Esc → закрыть без вставки

### 2. Wikilink Navigation в Live Preview

- В live preview: wikilink отображается как ссылка (подчеркнутая, цвет accent)
- Hover → tooltip с preview (title + first 100 chars)
- Ctrl+Click / Cmd+Click → навигация к странице
- Обычный Click → фокус на блоке (как сейчас)

### 3. Wikilink Insert в Source Mode

- В source mode: вставка `[[Page]]` или `[[Page|Alias]]` на позицию курсора
- Если есть выделение — используется как alias

## Затронутые области

- `packages/mdock-editor/src/core/extensions/livePreview.ts` — wikilink rendering + click handlers
- `packages/mdock-editor/src/core/commands/toolbarCommands.ts` — wikilink command
- `packages/mdock-editor/src/react/MarkdownEditor.tsx` — autocomplete integration
- `web/src/features/editor/mdockEditorConfig.js` — wikilink command config
- `web/src/features/editor/MarkdownEditor.jsx` — autocomplete integration
- `web/src/features/editor/mdockEditorConfig.js` — wikilink command config
- `web/src/api/vaults.js` — новый эндпоинт для page search (прокси к Page Index API)
- `internal/app/routes.go` — прокси эндпоинт для page search

## Критерии приёмки

- [ ] Ввод `[[` в source/live режиме открывает autocomplete за < 150ms
- [ ] Fuzzy search работает за < 100ms на 5k+ заметках
- [ ] Выбор из autocomplete вставляет корректный wikilink
- [ ] В live preview: wikilink кликабелен, Ctrl+Click навигирует
- [ ] Hover на wikilink показывает tooltip с preview
- [ ] Source mode: кнопка Wikilink открывает picker
- [ ] Все тесты проходят (`go test ./...`, `npm test`)

## План тестирования

1. Unit: `SearchPageIndex` fuzzy search accuracy
2. Unit: Autocomplete debounce + results rendering
3. Integration: Wikilink insert в source mode
4. Integration: Live preview wikilink click/hover/navigation
5. E2E: Создание заметки -> wikilink -> навигация

## Результаты валидации

(заполняется после реализации)

## Откат

Отключить wikilink autocomplete в конфиге, убрать wikilink renderer из live preview.