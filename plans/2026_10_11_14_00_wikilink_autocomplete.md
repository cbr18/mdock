# План реализации: Wikilink Autocomplete + Navigation

**Task:** [2026_10_11_14_00_wikilink_autocomplete.md](../tasks/2026_10_11_14_00_wikilink_autocomplete.md)

---

## Последовательность реализации

### Фаза 1: Backend — Page Search Proxy (0.5 дня)

1. **API Endpoint** (`internal/app/routes.go` + `internal/app/page_search.go`)
   - `GET /api/vaults/{slug}/pages/search?q={q}&limit={limit}`
   - Проксирует вызов `store.SearchPageIndex(vaultSlug, query, limit)`
   - Возвращает JSON: `{ results: [{ path, title, aliases, preview }] }`

2. **Роуты** (`internal/app/routes.go`)
   - Добавить `GET /api/vaults/{slug}/pages/search`

### Фаза 2: Editor Core — Wikilink Rendering в Live Preview (1 день)

1. **Live Preview Extension** (`packages/mdock-editor/src/core/extensions/livePreview.ts`)
   - В `RenderedMarkdownBlockWidget.renderContent`: найти wikilinks в тексте
   - Заменить `[[Page]]` и `[[Page|Alias]]` на интерактивные элементы:
     ```tsx
     <a className="cm-wikilink" 
        data-page-path={path} 
        data-page-title={title}
        onClick={handleWikilinkClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}>
       {alias || title}
     </a>
     ```

2. **Event Handlers**
   - `handleWikilinkClick`: `e.ctrlKey || e.metaKey` → навигация, иначе фокус
   - `showTooltip`: render tooltip с preview (title + first 100 chars body)
   - `hideTooltip`: скрыть tooltip

### Фаза 3: Editor Core — Autocomplete (1.5 дня)

1. **Autocomplete Extension** (`packages/mdock-editor/src/core/extensions/autocomplete.ts` — новый файл)
   - CodeMirror 6 autocomplete extension
   - Trigger: `[[` (в source и live режимах)
   - Debounce 150ms, min 2 chars после `[[`
   - Вызов `store.SearchPageIndex` через API proxy

2. **Autocomplete UI**
   - Позиционирование под курсором
   - Список результатов: title, alias, preview (first 100 chars)
   - Keyboard navigation: ↑/↓, Enter (select), Esc (close)
   - Click → вставка `[[Page]]` или `[[Page|Alias]]`

### Фаза 4: Toolbar Integration (0.5 дня)

1. **Toolbar Command** (`packages/mdock-editor/src/core/commands/toolbarCommands.ts`)
   - Wikilink command уже есть, обновить `run` для открытия picker модалки
   - Picker модалка: поиск + список результатов + preview

2. **mdockEditorConfig** (`web/src/features/editor/mdockEditorConfig.js`)
   - Обновить wikilink command: добавить `openPicker` action

### Фаза 5: Web App Integration (1 день)

1. **API Proxy** (`internal/app/routes.go` + `internal/app/page_search.go`)
   - `GET /api/vaults/{slug}/pages/search?q={q}&limit={limit}`
   - Проксирует `store.SearchPageIndex`

2. **Web Editor Config** (`web/src/features/editor/mdockEditorConfig.js`)
   - Подключить autocomplete к `@mdock/editor` React wrapper

3. **MarkdownEditor.jsx** (`web/src/features/editor/MarkdownEditor.jsx`)
   - Передать `onWikilinkSearch` callback в `MarkdownEditor`

### Фаза 6: Live Preview Navigation (0.5 дня)

1. **Wikilink Click Handler** (`livePreview.ts`)
   - `e.ctrlKey || e.metaKey` → `navigateToPage(path)`
   - Иначе: фокус на блоке (текущее поведение)

2. **Tooltip** (hover)
   - Позиционирование рядом с курсором
   - Содержимое: title + first 100 chars body
   - Закрытие по mouseleave / click outside

### Фаза 7: Тесты (1 день)

1. **Unit**: `SearchPageIndex` fuzzy search
2. **Integration**: Autocomplete debounce + results
3. **Integration**: Wikilink insert в source mode
4. **Integration**: Live preview wikilink click/hover/navigation

---

## Проверки

| Этап | Проверка | Команда |
|------|----------|---------|
| 1 | Backend search API | `go test ./internal/app/... -run TestPageSearch` |
| 2 | Live preview wikilink rendering | `npm test -- --filter livePreview` |
| 3 | Autocomplete integration | `npm test -- --filter MarkdownEditor` |
| 4 | E2E wikilink flow | `npm test -- --filter App` |

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Autocomplete позиционирование в live preview | Средняя | Средняя | Использовать `view.coordsAtPos` |
| Fuzzy search производительность | Низкая | Высокая | FTS5 уже оптимизирован |
| Live preview wikilink click конфликт с selection | Средняя | Высокая | `e.ctrlKey || e.metaKey` для навигации |
| Autocomplete позиционирование в live preview | Средняя | Средняя | `view.coordsAtPos` + `view.domAtPos` |

---

## Заметки по откату

1. Удалить autocomplete extension из `createEditor`
2. Убрать wikilink renderer из `livePreviewExtension`
3. Удалить API endpoint `/pages/search`
4. Убрать wikilink command из тулбара

---

## Параллелизуемые работы

- Фаза 1 (Backend) + Фаза 2 (Live Preview Rendering) — независимы
- Фаза 3 (Autocomplete) зависит от Фазы 1
- Фаза 4 (Toolbar) зависит от Фазы 3
- Фаза 5 (Web Integration) зависит от Фазы 1+3
- Фаза 6 (Navigation) зависит от Фазы 2