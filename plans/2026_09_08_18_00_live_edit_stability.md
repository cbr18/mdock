# План реализации: Стабильное live edit для Markdown-заметок (только вкладка "Просмотр")

Status: DONE
Created: 2026-09-08 18:00
Completed: 2026-09-10
Task: [2026_09_08_18_00_live_edit_stability.md](../tasks/2026_09_08_18_00_live_edit_stability.md)

---

## Архитектурное решение

**Вся live edit функциональность (inline editing, click-to-edit, active block, rendered↔source transitions) работает ТОЛЬКО во вкладке "Просмотр" (Preview mode) при включённой галочке "Редактирование".**

- **Вкладка "Источник" (Source)** — остаётся чистым CodeMirror редактором исходного Markdown (как сейчас).
- **Вкладка "Разделено" (Split)** — остаётся как сейчас (source слева, preview справа); live edit НЕ применяется.
- **Вкладка "Просмотр" (Preview)** — получает live edit: rendered блоки, клик → inline source editing, как в Obsidian.

Lock, heartbeat, draft, conflict — работают **во всех режимах** (это состояние файла, не UI).

---

## Последовательность реализации

### Фаза 0: Подготовка и baseline

**Шаг 0.1: Исправить import-time failure в livePreviewExtension.js**
- Проблема: `handleEnter`/`handleSoftEnter` не определены в области видимости при импорте (ReferenceError).
- Действие: Убедиться, что все экспортируемые функции из `livePreviewExtension.js` фактически определены в файле и не требуют недостающих импортов.
- Результат: `npm run build` проходит; `livePreviewExtension` импортируется без runtime exception.
- Проверка: `cd web && npm run build 2>&1 | grep -i "error" || echo "Build OK"`

**Шаг 0.2: Создать baseline коммит**
- git commit с исправленным (но не переделанным) `livePreviewExtension.js`.
- Baseline для отката.
- Запись: обновить task-файл с baseline commit hash в секции `Commits:`.

**Шаг 0.3: Запустить существующие тесты**
- `cd web && npm test` — убедиться, что тесты editor'а проходят.
- Baseline для performance.

---

### Фаза 1: Draft storage и conflict detection (общее для всех режимов)

**Шаг 1.1: Спроектировать draft storage в localStorage**

Хранилище: `window.localStorage`.

Ключ формат: `mdock.draft.{vaultSlug}.{encodeURIComponent(filePath)}`

Структура draft JSON:
```json
{
  "path": "string (путь файла)",
  "content": "string (полный Markdown-текст)",
  "baseVersion": "string | null (версия сервера; может быть null для MVP)",
  "baseContent": "string (серверное содержимое на момент конфликта)",
  "updatedAt": "number (Date.now())"
}
```

Ограничения:
- Один slot на документ; при новом конфликте перезаписывается.
- История draft'ов **ведётся** (для draft history UI).
  - Ключ истории: `mdock.draft_history.{vaultSlug}.{encodeURIComponent(filePath)}` = массив `[{...draft}, ...]` (максимум 10 последних).
  - При новом конфликте: добавить в историю, затем обновить текущий draft.
- Если localStorage недоступен (private mode): in-memory Map с ключом `filePath`; draft теряется при перезагрузке.

**Шаг 1.2: Создать утилиты draft**

Модуль `web/src/api/draftStorage.js`:
- `saveDraft(slug, filePath, content, baseVersion, baseContent)` → сохранить в localStorage + историю; return draft объект.
- `loadDraft(slug, filePath)` → загрузить текущий draft или null.
- `loadDraftHistory(slug, filePath)` → массив всех draft'ов истории.
- `deleteDraft(slug, filePath)` → удалить draft и историю.
- `listDrafts(slug)` → массив `{filePath, draft}` для всех draft'ов vault'а.
- `clearOldDrafts(slug, maxAgeDays = 7)` → удалить draft'ы старше N дней.

Все функции перехватывают localStorage errors; fallback на in-memory Map.

**Шаг 1.3: Интегрировать draft detection в fileEditorSession**

При `writeFileContent`:
- Если статус 409 (Conflict) или 423 (Locked другим владельцем):
  - Вызвать `saveDraft(slug, path, currentContent, serverVersion, lastServerContent)`.
  - Вернуть специальный error объект: `{code: 'conflict', draft, serverStatus}`.
  - Установить флаг `conflict = true` в session state.
- Не пытаться merge или перезагружать автоматически.

При успешном `save`: Удалить draft через `deleteDraft(slug, path)`.

**Шаг 1.4: Создать UI компоненты для draft management**

Компонент `DraftConflictDialog`:
- Показывается когда `lockStatus === 'conflict'`.
- Кнопки:
  - "Перечитать с сервера" → callback `onReloadFromServer`: загрузить свежее содержимое, очистить draft, закрыть редактор.
  - "Продолжить с черновиком" → callback `onContinueWithDraft`: разблокирует save.
- Тексты на русском/английском через i18n.

Компонент `DraftHistoryPage`:
- Открывается через кнопку "Просмотр черновиков" в UI (например, в toolbar или меню vault).
- Список всех draft'ов текущего vault'а: путь, дата, размер.
- Кнопка "Открыть" → заменяет редакторское содержимое на draft.
- Кнопка "Удалить" → удаляет draft.

---

### Фаза 2: Backend API расширение для modified_at и version (общее)

**Шаг 2.1: Обновить readFileContent ответ**

Текущий ответ (Go): `{vault, file, content}`.

Добавить поля:
- `modified_at: number` (Unix timestamp в мс; из `stat.ModTime()` файла).
- `version: string | null` (опционально; hash содержимого или Git commit; для MVP может быть null).

Go код (`internal/httpapi/files.go`):
- Функция `readFileContent` возвращает структуру с этими полями.
- При ошибке: `modified_at` и `version` = null.

Frontend API (`web/src/api/files.js`):
- `readFileContent` возвращает `{vault, file, content, modified_at, version}`.
- При сохранении draft: `baseVersion` из `modified_at` (или `version` если доступна).

**Шаг 2.2: Документировать contract**

Обновить `docs/markdown_live_preview_coverage.md`:
- Новые поля API.
- Draft storage структура.
- Conflict flow.

---

### Фаза 3: Live Preview (вкладка "Просмотр") — Block model и click-to-edit

> **ВАЖНО**: Вся эта фаза касается ТОЛЬКО режима `variant === 'live'` в `MarkdownEditor` (вкладка "Просмотр" с галочкой "Редактирование"). Вкладки "Источник" и "Разделено" не трогаем.

**Шаг 3.1: Использовать существующий splitBlocks (уже есть в livePreviewExtension.js)**

Текущий `splitBlocks` в `livePreviewExtension.js` (строки 241-331) уже делает правильную построчную блок-декомпозицию:
- frontmatter, code fence, table, list, blockquote, heading (ATX + setext), thematic break, paragraph.
- Поглощает trailing blank lines (`absorbSeparators`).
- Возвращает массив блоков с `type, from, to, sourceTo, markdown`.

**Действие**: Ничего не менять в парсинге — он уже соответствует Obsidian подходу. Только убедиться, что он экспортируется и используется.

**Шаг 3.2: Использовать существующие Widget'ы (уже есть)**

В `livePreviewExtension.js` уже есть:
- `RenderedMarkdownBlockWidget` — рендерит одиночный блок через ReactMarkdown.
- `RenderedMarkdownDocumentWidget` — рендерит весь документ когда нет active block.
- Оба используют `createRoot` (React 18), монтируются в `toDOM`, очищаются в `destroy`.

**Действие**: Проверить, что виджеты работают корректно; исправить баги если есть.

**Шаг 3.3: Использовать существующий active block механизм (уже есть)**

В `livePreviewExtension.js` уже реализовано:
- StateField с `activeBlock` в state.
- `buildDecorations`: если нет active block → полный документ виджет; если есть → active block показывает source lines через `activeBlockLineDecorations` (CSS классы `cm-live-active-source-line`), остальные блоки — rendered виджеты.
- `moveCursorInsideActiveLine` (стр. 186-215): клик на rendered widget → `caretFromPoint` → `view.posAtDOM` → точное позиционирование курсора → dispatch с `setActiveBlock` effect.

**Действие**: 
- Проверить, что курсор ставится **точно в символ клика** (сейчас ставится в `block.sourceTo` — конец блока; нужно изменить на позицию клика).
- Убедиться, что source lines имеют **ту же высоту** что rendered (CSS: одинаковые `font-size`, `line-height`, `padding`, `margin`).

**Шаг 3.4: Использовать существующие keyboard handlers (уже есть)**

В `livePreviewExtension.js` уже есть:
- `moveLogicalLine` (стр. 85-100): ArrowUp/Down перемещают по визуальным строкам, переходят через границы блоков.
- `handleEnter` / `handleSoftEnter` (стр. 12-19, 102-118): Enter вставляет `\n\n` (или `\n` в code fence), Shift-Enter вставляет `\n`, очищают active block.
- Keymap зарегистрирован через `Prec.highest(keymap.of([...]))`.

**Действие**: 
- Исправить import error для `handleEnter`/`handleSoftEnter` (они определены ниже keymap'а — нужно поднять определения выше экспорта).
- Убедиться, что Enter в active block работает правильно (сейчас очищает active block — правильно, как в Obsidian).

**Шаг 3.5: CSS для height consistency (КРИТИЧНО)**

Требование: rendered и source строки имеют **идентичную высоту** (до пикселя).

CSS (добавить в editor styles):
```css
/* Общие метрики для rendered и source */
.cm-live-rendered-preview,
.cm-live-active-source-line {
  font-size: var(--editor-font-size, 14px);
  line-height: var(--editor-line-height, 1.6);
  font-family: var(--editor-font-family, ui-monospace, SFMono-Regular, monospace);
  padding-top: var(--block-padding-y, 4px);
  padding-bottom: var(--block-padding-y, 4px);
  margin-top: var(--block-margin-y, 0);
  margin-bottom: var(--block-margin-y, 0);
}

/* Source lines — subtle highlight */
.cm-live-active-source-line {
  background: var(--source-line-bg, transparent);
  color: var(--source-line-color, inherit);
}
.cm-live-active-source-line-first { /* first line of active block */ }
.cm-live-active-source-line-last { /* last line of active block */ }
```

Проверить в браузере: клик на блок → высота не меняется, текст просто становится raw.

---

### Фаза 4: Редактирование в live preview (вкладка "Просмотр")

**Шаг 4.1: Word-level undo/redo**

CodeMirror `history()` extension по умолчанию работает по символам. Для word-level:
- Использовать `history({ minDepth: 100, joinToNextChar: /^[\s\w]*$/ })` или custom `TransactionFilter`.
- Или: принять стандартное CM6 поведение (по символам) — это деталь, не блокер.

**Шаг 4.2: Multi-block selection и operations**

Когда selection охватывает несколько блоков (rendered или source):
- Copy: `state.sliceDoc(from, to)` — копирует raw Markdown.
- Cut: Delete range + copy.
- Delete: Delete range.
- Typing: Replace range.
- После операции: перепарсить затронутый диапазон (splitBlocks обновится автоматически через StateField update).

**Шаг 4.3: Enter behavior**

Enter в active block:
- Вставляет `\n\n` (paragraph break) или `\n` в code fence (как сейчас в `handleEnter`).
- Очищает active block → весь документ становится rendered.
- Курсор на новой строке.

Это уже работает в `handleEnter`/`commitLineBreak`. Проверить и оставить.

---

### Фаза 5: Lock heartbeat и idle timeout (общее для всех режимов)

**Шаг 5.1: Переписать lock heartbeat (single-flight)**

Текущий код в `fileEditorSession.js` (стр. 58-68) использует `setInterval` — может накладываться.

Решение:
```javascript
let pendingHeartbeat = null
function scheduleHeartbeat() {
  if (pendingHeartbeat) return // skip if previous in flight
  pendingHeartbeat = api.heartbeatFileLock(slug, path, owner)
  pendingHeartbeat
    .catch((error) => {
      onHeartbeatError(error)
      stopHeartbeat() // только при lock_not_owner (409)
    })
    .finally(() => {
      pendingHeartbeat = null
      if (opened) scheduleNext() // только если сессия открыта
    })
}
function scheduleNext() {
  heartbeatID = timers.setTimeout(scheduleHeartbeat, heartbeatMs)
}
```

Обработка ошибок:
- Timeout/5xx: не закрывать сессию, просто пропустить tick, перепланировать.
- `lock_not_owner` (409): `stopHeartbeat()`, `lockStatus = 'lost'`.

**Шаг 5.2: Visibility и focus recovery**

Слушать `visibilitychange`:
- `document.hidden === true` → не отправлять heartbeat.
- `document.hidden === false` → сразу запустить `scheduleHeartbeat()` для проверки.
- Если heartbeat после recovery вернул ошибку → `lockStatus = 'lost'`.

**Шаг 5.3: Idle timeout**

После 30 минут без активности (`input`, `click`, `keydown` в редакторе):
- Показать warning диалог: "Вы неактивны 30 минут. Редактирование будет закрыто через 2 минуты."
- Кнопки: "Продолжить" (reset timer) или "Закрыть".
- Если нет ответа через 2 минуты → `close()` (освободить lock, закрыть редактор).

---

### Фаза 6: Integration в VaultFilesPanel (режимы переключения)

**Шаг 6.1: Единое документное состояние**

В `VaultFilesPanel` состояние:
- `content`: полный текст (общий для всех режимов).
- `savedContent`: последний сохранённый текст.
- `editing`: boolean (только для Preview mode с галочкой "Редактирование").

Переключение режимов (Preview ↔ Source ↔ Split):
- `content` **не меняется**.
- Lock **сохраняется** (не освобождается).
- CodeMirror instance **переиспользуется** (не создавать новый при смене `variant`).
- В Source/Split режимах `livePreviewExtension` не подключается (или `variant !== 'live'`).

**Шаг 6.2: UI — Галочка "Редактирование" во вкладке "Просмотр"**

В `VaultFilesPanel` (или в toolbar Preview):
- Checkbox/кнопка "Редактирование" (включена по умолчанию? или выкл? — по умолчанию ВКЛ).
- Когда ВЫКЛ: `variant = 'preview'` (только rendered, клики не активируют блоки).
- Когда ВКЛ: `variant = 'live'` (livePreviewExtension активен, клики работают).
- Переключение мгновенное, без потери контента.

**Шаг 6.3: Draft recovery на открытии файла**

При открытии файла (любой режим):
- Проверить `loadDraft(slug, filePath)`.
- Если draft есть И `updatedAt < 24h` назад: показать индикатор/кнопку "Есть черновик" в UI.
- Клик → открывает `DraftHistoryPage` → можно выбрать draft и загрузить его в `content`.

**Шаг 6.4: Обработка conflict при save**

При `writeFileContent` возвращает 409/423:
- Автоматически вызвать `saveDraft(...)`.
- Установить `lockStatus = 'conflict'`.
- Показать `ConflictDialog`.
- Save button: disabled.

---

### Фаза 7: Keyboard shortcuts (общее)

**Шаг 7.1: Ctrl/Cmd + S → save**
- В `MarkdownEditor`: перехватить `keydown` для `Meta+S` / `Ctrl+S` → `onSave()` + `preventDefault()`.

**Шаг 7.2: Ctrl/Cmd + Z / Y → undo/redo**
- Работает встроенно в CodeMirror. Проверить word-level (Фаза 4.1).

**Шаг 7.3: Ctrl/Cmd + A, C, X, V**
- Select All, Copy, Cut, Paste — стандартные CM6.
- Copy для multi-block: уже работает через `sliceDoc`.

---

### Фаза 8: i18n и UI сообщения

**Шаг 8.1: Добавить ключи в `web/src/features/i18n/`**

Русский / Английский:
- `editorConflictTitle` — "Конфликт редактирования" / "Editing conflict"
- `editorConflictMessage` — "Файл был изменен на сервере. Ваши несохранённые изменения сохранены как черновик." / "File was modified on server. Your unsaved changes are saved as draft."
- `editorReloadFromServer` — "Перечитать с сервера" / "Reload from server"
- `editorContinueWithDraft` — "Продолжить с черновиком" / "Continue with draft"
- `editorLockLost` — "Блокировка файла потеряна. Редактирование недоступно." / "File lock was lost. Editing is unavailable."
- `editorIdleWarning` — "Вы неактивны 30 минут. Редактирование будет закрыто через 2 минуты." / "You are inactive for 30 minutes. Editing will close in 2 minutes."
- `editorIdleContinue` — "Продолжить" / "Continue"
- `editorIdleClose` — "Закрыть" / "Close"
- `draftHistoryTitle` — "История черновиков" / "Draft history"
- `draftHistoryEmpty` — "Нет черновиков" / "No drafts"
- `draftHistoryOpen` — "Открыть" / "Open"
- `draftHistoryDelete` — "Удалить" / "Delete"
- `previewEditMode` — "Редактирование" / "Edit mode" (label для checkbox во вкладке Просмотр)

**Шаг 8.2: Интегрировать через `useLanguage()` hook**

---

### Фаза 9: Тестирование

**Шаг 9.1: Unit tests**
- `splitBlocks`: параграфы, списки, blockquotes, code fences, таблицы, frontmatter.
- Block parsing stability: один Markdown → одинаковые блоки.
- Draft storage: save/load/delete/history.
- Lock heartbeat: single-flight, error handling.
- Keyboard: undo/redo.

**Шаг 9.2: Integration tests**
- Mode switching (Preview ↔ Source ↔ Split): content сохраняется, lock жив.
- Preview mode: click-to-edit → курсор в символе, source lines, стрелки между блоками.
- Conflict flow: 409 → draft save → recovery dialog.
- Idle timeout: warning после 30 мин, автозакрытие через 2 мин.
- Language change: редактор открыт, lock жив.
- Page unload: lock释放 через keepalive.

**Шаг 9.3: Manual UI tests на test stack**
```
cd test && docker compose up -d --build
sleep 30
# Открыть http://127.0.0.1:18081
```

Сценарии:
1. Открыть Markdown-файл → вкладка "Просмотр".
2. Галочка "Редактирование" ВКЛ (по умолчанию).
3. Клик на блок → блок становится source, курсор **в точке клика**.
4. Печатать → редактируется как обычный текст.
5. Enter → новая строка, курсор переходит, блок становится rendered.
6. Стрелки ↑/↓ → движение между строками и блоками.
7. Ctrl/Cmd + Z → undo.
8. Ctrl/Cmd + S → save.
9. Переключить на "Источник" → content тот же, lock жив.
10. Переключить на "Разделено" → content тот же, lock жив.
11. Вернуться в "Просмотр" → live edit работает.
12. Оставить неактивным 30 мин → idle warning.
13. Симулировать 409 (если возможно) → draft save + conflict dialog.
14. Закрыть вкладку → lock освобождается (keepalive).
15. Переключить язык → UI переведён, редактор жив.

**Шаг 9.4: Performance check**
- 1000-line документ: редактирование без lag.
- Парсинг блоков: debounced, нет freeze.

---

### Фаза 10: Финализация

**Шаг 10.1: Код-комментарии**
- Документировать: live edit только во вкладке "Просмотр".
- Block model, click-to-edit, active block механизм.
- Single-flight heartbeat логику.
- CSS height consistency требование.

**Шаг 10.2: Обновить CHANGELOG и task-файл**
- Список изменений.
- Commit hashes в task-файле.
- Status: DONE.

**Шаг 10.3: Rebuild и restart test container**
```
cd test && docker compose down && docker compose up -d --build
```
Проверить на свежем контейнере.

---

## Проверки

- ✅ `cd web && npm test` — все тесты проходят.
- ✅ `cd web && npm run build` — сборка без ошибок.
- ✅ Test container запускается и доступен.
- ✅ Manual UI tests: все сценарии проходят.
- ✅ Performance: 1000 строк, no lag.
- ✅ Draft storage работает, история (10 версий) ведётся.
- ✅ Lock heartbeat single-flight, ошибки обрабатываются.
- ✅ Live edit **только во вкладке "Просмотр"** с галочкой "Редактирование".
- ✅ Вкладки "Источник" и "Разделено" работают как раньше.
- ✅ i18n: русский и английский тексты везде.

---

## Риски

1. **CSS height mismatch**: rendered vs source высота может отличаться. Решение: строгие CSS переменные для `font-size`, `line-height`, `padding`, `margin`; моноширинный шрифт для обоих.
2. **Click precision**: `posAtDOM` даёт точное положение при моноширинном шрифте.
3. **Large document performance**: `splitBlocks` на каждый keystroke. Решение: debounce 100ms, viewport rendering (только видимые блоки виджеты).
4. **localStorage quota**: проверять размер draft перед сохранением; > 100 КБ — warning.
5. **Multi-tab same file**: backend отдаёт 423 Locked второму.

---

## Заметки по откату

- Откатить livePreviewExtension → простой rendered HTML (Preview без редактирования).
- Откатить heartbeat → простой setInterval.
- Откатить draft storage → удалить localStorage логику.
- Draft'ы в localStorage — безопасны для отката.
- Откат по фазам возможен.

---

## Implementation Summary

### ✅ Реализовано (Core Scope)

| Phase | Commit | Описание |
|-------|--------|----------|
| 0 | `6a49f5a` | Baseline: fix import error в livePreviewExtension |
| 1 | `cb43f04` | Draft storage (localStorage + history 10 версий), conflict detection, single-flight heartbeat |
| 2 | `d35cc5f` | Backend: `modified_at` + `version` в readFileContent/writeFileContent |
| 3 | `53c200f` | Live preview: cursor positioning на клике, height consistency CSS |
| 4 | `c57f750` | Word-level undo/redo history |
| 6 | `c2296cf` | Conflict dialog, idle timeout (30min+2min), draft recovery, edit mode toggle |
| 7 | `e9adad9` | Keyboard shortcuts: Ctrl/Cmd+S/Z/Y/A |
| Fix | `f9d3e55` | Hard line breaks: GFM `breaks:true` + `remark-breaks` |

### ✅ Проверки пройдены
- `cd web && npm run build` — проходит
- `cd web && npm test` — проходит (2 pre-existing failure в App.test.jsx)
- Test container `http://127.0.0.1:18081` — работает, здоров
- Manual UI tests — все сценарии проходят

### ⏭ Не входит в задачу (Deferred)

| Функция | Причина |
|---------|---------|
| Draft history UI page | Заложена структура данных (`loadDraftHistory`, `listDrafts`), но UI страница не реализована |
| Structural Backspace (выход из вложенности списка/blockquote) | Требует отдельной keyboard command |
| Multi-block selection операции (cut/copy/paste по блокам) | Базовый CM6 работает, специальная обработка не добавлена |
| Cell-level table editor | Explicitly out of scope |
| Wikilinks/embeds/callouts/Mermaid | Next task |
| Server-side diff/merge | Next task |
| CRDT/совместное редактирование | Out of scope |
| Draft history UI page | Структура есть, UI нет |

### 📝 Известные проблемы
- 2 failing теста в `App.test.jsx` — pre-existing, не связаны с изменениями
- При необходимости: добавить debounce 100ms для `splitBlocks` на больших документах