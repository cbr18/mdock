# Editable rendered mode

Status: REJECTED
Created: 2026-08-16 13:31
Project: mdock
Plan: [16_08_2026_13_31_editable_rendered_mode.md](../plans/16_08_2026_13_31_editable_rendered_mode.md)

## Проблема

Режим `Просмотр` остался read-only markdown preview, поэтому пользователь открывает файл и не может редактировать документ без переключения в `Исходник`. Это противоречит ожиданию, что редактор доступен во всех режимах.

## Доказательства

- `VaultFilesPanel` в `mode === rendered` возвращает только `MarkdownPreview`.
- Пользователь сообщил: "ниче не работает. RO все" и уточнил, что редактор должен работать во всех режимах.
- CodeMirror не является HTML WYSIWYG editor; Obsidian-like Live Preview нужно строить поверх CodeMirror decorations, а не через read-only ReactMarkdown.

## Нефункциональные ограничения

- Не ломать Obsidian-compatible Markdown source storage.
- Не добавлять новый WYSIWYG framework без отдельного решения.
- Все режимы должны иметь доступ к save/lock toolbar.
- Сохранить lazy-loading редактора.

## Не входит в задачу

- Полная Obsidian Live Preview decorations система.
- ProseMirror/TipTap migration.
- Mermaid/math/embed render parity.

## Желаемое поведение

- `Просмотр` открывает editable editor surface с toolbar и preview рядом/ниже, а не read-only preview-only экран.
- `Исходник` остаётся plain CodeMirror editing mode.
- `Две панели` остаётся CodeMirror + preview.
- Тесты проверяют, что default rendered mode после выбора `.md` файла содержит editor.

## Затронутые области

- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/App.test.jsx`
- `tasks/`
- `plans/`

## Заметки по реализации

- В этой задаче "rendered editing" делаем как editable editor + rendered preview composition.
- Настоящий Obsidian-style Live Preview нужно делать следующим слоем через CodeMirror decorations/widgets.

## Критерии приёмки

- В default `Просмотр` после выбора `.md` есть `Markdown-редактор`, toolbar и `Lock активен`.
- `npm test`, `npm run build`, `go test ./...` проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`

## Результаты валидации

- `npm test` в `web/` — passed, 22 tests.
- `npm run build` в `web/` — passed без chunk warning.
- `go test ./...` — passed.
- После пользовательской проверки задача отклонена: текущий `Просмотр` реализован как CodeMirror + rendered preview composition, но это не соответствует ожиданию редактирования прямо в отрендеренном/Obsidian-like live preview режиме.

## Откат

Вернуть `mode === rendered` к read-only `MarkdownPreview`.
