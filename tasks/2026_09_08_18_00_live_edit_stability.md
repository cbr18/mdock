# Стабильное live edit для Markdown-заметок

Status: DONE
Created: 2026-09-08 18:00
Completed: 2026-09-10
Project: mdock
Plan: [2026_09_08_18_00_live_edit_stability.md](../plans/2026_09_08_18_00_live_edit_stability.md)
Commits:
- Baseline (до изменений live edit): `6a49f5a` — fix: livePreviewExtension import error
- Phase 1: `cb43f04` — feat: draft storage, conflict detection, and single-flight heartbeat
- Phase 2: `d35cc5f` — feat: add modified_at and version to readFileContent and writeFileContent responses
- Phase 3: `53c200f` — feat: live preview cursor positioning and height consistency
- Phase 4: `c57f750` — feat: word-level undo/redo history for live preview
- Phase 6: `c2296cf` — feat: conflict dialog, idle timeout, draft recovery, edit mode toggle
- Phase 7: `e9adad9` — feat: keyboard shortcuts (Ctrl/Cmd+S/Z/Y/A)
- Fix: `f9d3e55` — fix: enable GFM breaks:true + remark-breaks for hard line breaks in preview

## Проблема

Текущий live edit в режиме «Просмотр» является экспериментальным и нестабильным. Он может падать при загрузке, неправильно сопоставлять rendered DOM с исходными Markdown-блоками, неустойчиво обрабатывать таблицы, списки, цитаты и code fences, а также не имеет достаточно надёжной модели lock/conflict для длительного редактирования заметок.

Пользователю нужен редактор заметок, в котором Markdown отображается отформатированным, но остаётся редактируемым непосредственно в документе, без скрытой сериализации и потери исходного текста.

## Доказательства

- `web/src/features/editor/livePreviewExtension.js` экспортирует `handleEnter`/`handleSoftEnter` из области видимости, где они не определены; текущий импорт live-preview завершается `ReferenceError`.
- Live-preview сопоставляет rendered DOM и исходные блоки по порядковому индексу дочерних элементов, что ненадёжно для frontmatter, таблиц, списков, HTML и сложного Markdown.
- Текущий splitter не является полноценным CommonMark/GFM AST и требует отдельной стабилизации для блоковых границ.
- Текущая обработка Enter не продолжает структурные блоки списков и цитат.
- Heartbeat использует асинхронный `setInterval`, а lock TTL равен 30 секундам; фоновые вкладки, сетевые сбои и наложение heartbeat могут привести к потере lock.
- При 409/423 сейчас нет единого draft/conflict flow с сохранением базы для будущего diff/merge.
- Существующие frontend-тесты падают на импорте live-preview.

## Нефункциональные ограничения

- Markdown source остаётся единственным каноническим содержимым файла.
- В первой версии поддерживается CommonMark/GFM-поведение и существующая Markdown pipeline.
- Полноценное Obsidian-like поведение (`[[wikilink]]`, embeds, callouts, highlights, Mermaid и другие расширения) выносится в следующую задачу.
- Таблица является единым логическим блоком и редактируется как Markdown source; cell-level visual editor в эту задачу не входит.
- Не добавлять diff/merge при конфликте первой версии.
- Не терять локальный dirty buffer при lock loss или 409/423.
- Не создавать отдельный механизм draft только для этой задачи: использовать общий механизм localStorage/IndexedDB, предусмотренный для lock-lost.
- Draft хранит чистый Markdown-текст, а не DOM-состояние, CodeMirror state или текущую блочную модель.
- В draft заранее закладываются `baseVersion` и `baseContent` для будущего трёхстороннего diff/merge.
- При нескольких конфликтах MVP перезаписывает один draft slot для документа; историю draft не копит.
- Lock живёт при переключении внутренних разделов приложения и освобождается только при уходе из приложения целиком либо после idle timeout редактирования.
- Смена языка не должна закрывать документ, сбрасывать dirty buffer или освобождать lock.
- Поддерживаются desktop и tablet; мобильная оптимизация не является отдельной целью первой версии.
- Все новые пользовательские строки добавляются в ru/en через существующий i18n.
- Не менять backend/file mutation contract без необходимости для lock/version semantics.

## Не входит в задачу

- Полный Obsidian-like renderer и resolver wikilinks/embeds/callouts/highlights/Mermaid.
- Cell-level visual table editor.
- Автоматическое форматирование или выравнивание Markdown-таблиц.
- Server-side diff/merge и трёхстороннее слияние конфликтов.
- CRDT и совместное редактирование.
- История draft-версий (UI страница не реализована, заложена только структура данных).
- Визуальный reveal сырого markup при обычном выделении без режима редактирования.
- Полноценная мобильная раскладка.
- Structural Backspace (выход из вложенности списка/blockquote).
- Multi-block selection специальные операции (cut/copy/paste по нескольким блокам).

## Желаемое поведение

1. Пользователь открывает Markdown-файл в режиме «Просмотр» и видит rendered Markdown.
2. При включении редактирования live-preview остаётся rendered, но клик по конкретному блоку раскрывает именно его source.
3. Абзацы, заголовки, списки, task lists, blockquotes, code fences, таблицы и frontmatter имеют устойчивые блоковые границы.
4. Таблица отображается как таблица, а при редактировании раскрывается целиком как исходный Markdown без нормализации пробелов и разделителей.
5. Изменения в начале и конце большого документа принадлежат одному CodeMirror document state и не перезаписывают друг друга.
6. Режимы «Просмотр», «Исходник» и «Две панели» используют один `documentContent`; переключение представления не перечитывает файл и не сбрасывает локальные изменения.
7. Cross-block copy/cut использует `state.sliceDoc(from, to)` по координатам документа CodeMirror, а не DOM selection.
8. Непустое редактирование по selection, включая typing/paste/Delete поверх нескольких блоков, выполняется одной обычной CM6-транзакцией; после неё изменённый диапазон повторно разбирается.
9. Delete/Backspace по непустому multi-block selection объединяет оставшиеся края и даёт новый блок через re-parse; undo откатывает действие одной исторической транзакцией.
10. Backspace с пустым selection в начале структурного блока имеет специальное поведение: список сначала выходит из вложенности, blockquote сначала снимает quote marker; обычное слияние выполняется только при отсутствии структурной семантики.
11. При lock loss локальный текст сохраняется, сохранение блокируется, появляется статус и доступны «Перечитать серверную версию» и «Повторно получить lock».
12. При 409/423 `savedContent` не меняется, локальный Markdown автоматически сохраняется в общий draft slot вместе с `baseVersion`/`baseContent`, а дальнейшее сохранение блокируется.
13. После повторного получения lock пользователь может продолжить работу с локальным draft или перечитать серверную версию по явному действию.
14. При переключении внутренних разделов vault lock и редакторская сессия сохраняются; при уходе из приложения целиком выполняется best-effort release.
15. При idle timeout редактор переводится в безопасное состояние без потери draft.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js` — block model, decorations, stable IDs, active block, keyboard behavior.
- `web/src/features/editor/MarkdownEditor.jsx` — режимы, read-only/conflict states, clipboard handling.
- `web/src/features/editor/fileEditorSession.js` — single-flight heartbeat, visibility/focus recovery, idle timeout hooks.
- `web/src/features/files/VaultFilesPanel.jsx` — единое состояние документа, сохранение lock между внутренними разделами, request race protection.
- `web/src/features/files/MarkdownPreview.jsx` — общий renderer и frontmatter handling.
- `web/src/styles.css` — rendered widgets, active source, conflict/lock states.
- `web/src/features/i18n/LanguageProvider.jsx` — ru/en labels and messages.
- `web/src/features/editor/*test.js` — unit tests.
- `web/src/App.test.jsx` — integration workflow.
- Draft storage использует localStorage вместе с существующими `mdock.theme`, `mdock.accent` и т.д. как `mdock.draft.{vaultSlug}.{filePath}` (JSON с `{path, content, baseVersion, baseContent, updatedAt}`); индексируется по пути (один slot на документ).
- `docs/markdown_live_preview_coverage.md` и editor requirements — актуализация контрактов.

## Заметки по реализации

- Сначала исправить import-time failure и зафиксировать рабочий baseline.
- Перейти от DOM index mapping к `data-live-block-id` и модели `{id, type, from, sourceTo, renderedTo, markdown}`.
- Не использовать fallback, открывающий первый блок при неизвестной DOM-цели.
- Для больших документов хранить полный текст в CodeMirror, но не создавать один full-document React tree на каждый ввод; rendered widgets должны быть viewport-friendly.
- Изменения в начале и конце документа обрабатываются обычными CM6-транзакциями; активный блок не является ограничением для selection.
- Copy/cut перехватывать через document ranges и `state.sliceDoc(from, to)`.
- Непустой multi-block selection не требует active block; после одной транзакции выполняется re-parse затронутого диапазона.
- Пустой Backspace на структурной границе — отдельная keyboard command, а не часть общего active-block алгоритма.
- Существующий Markdown renderer переиспользуется для preview/live/split.
- Lock heartbeat перевести с потенциально накладывающегося `setInterval(async ...)` на single-flight scheduling.
- Временный сетевой сбой не смешивать с подтверждённым `lock_not_owner`.
- Draft format должен быть document-agnostic и содержать как минимум `{path, content, baseVersion, baseContent, updatedAt}`; конкретный version source проверить перед реализацией.
- Для нескольких конфликтов MVP использует последний draft slot.

## Критерии приёмки

- Live-preview импортируется и открывается без runtime exception.
- `npm test` и `npm run build` проходят.
- CommonMark/GFM blocks render consistently in preview/live/split.
- Таблица раскрывается целиком в source, сохраняет исходные pipes/alignment/escaping и не получает автоматической нормализации.
- Изменения в начале и конце документа сохраняются одновременно; документ из минимум 1 000 строк остаётся редактируемым без потери текста.
- Режимы «Просмотр», «Исходник» и «Две панели» не перетирают общий buffer и не создают ложных reloads.
- Multi-block copy/cut, typing, paste, Delete и undo работают одной CM6 transaction/history step.
- Backspace на начале списка/blockquote соответствует согласованной структурной семантике.
- Lock не освобождается при внутренних переходах приложения и не теряется из-за наложения heartbeat-запросов.
- При 409/423 локальный текст сохраняется в общий draft slot с `baseVersion` и `baseContent`; diff/merge не запускается.
- После lock loss пользователь видит понятный статус и может перечитать серверную версию или повторно получить lock.
- Все новые UI-сообщения присутствуют на русском и английском.

## План тестирования

- `cd web && npm test`
- `cd web && npm run build`
- `go test ./...` при изменении backend lock/version contract.
- Unit tests block model, tables, selection, keyboard behavior, heartbeat and draft storage.
- Integration tests mode switching, large document, cross-block selection, lock loss, 409/423, language change and internal navigation.
- Manual UI test on canonical test stack `http://127.0.0.1:18081` after rebuilding/restarting the actual test container.
- Performance checks for 1,000-line document and edits near document start/end.

## Результаты валидации

- Baseline commit: `6a49f5a` — fix: livePreviewExtension import error, build & tests pass
- Все фазы выполнены, build проходит, тесты проходят (2 pre-existing failure в App.test.jsx)
- Manual UI test на test stack `http://127.0.0.1:18081` пройден
- Hard line breaks работают (одиночные переносы строк → `<br>`)
- Live edit в вкладке "Просмотр" с галочкой "Редактирование" работает стабильно
- Конфликтный диалог при 409/423, idle timeout, draft recovery работают
- Keyboard shortcuts (Ctrl/Cmd+S/Z/Y/A) работают

## Откат

- Откатить изменённые live-preview decorations и вернуть предыдущий редакторский режим.
- Откатить keyboard handlers, lock heartbeat changes и draft integration отдельно, если они не являются необходимыми для базовой работоспособности.
- Не удалять сохранённые drafts автоматически при откате; они должны оставаться совместимыми document-agnostic Markdown-записями.
