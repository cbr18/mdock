# Explicit file edit mode

Status: DONE
Created: 2026-08-16 14:26
Project: mdock
Plan: [16_08_2026_14_26_explicit_file_edit_mode.md](../plans/16_08_2026_14_26_explicit_file_edit_mode.md)

## Проблема

Файл открывается сразу как редактируемый и берёт lock даже для просмотра. Во вкладке `Просмотр` отображается plain CodeMirror editor, хотя для source editing уже есть отдельная вкладка `Исходник`. Меню toolbar на `<details>` работают нестабильно.

## Доказательства

- Пользователь указал, что вкладки toolbar "Абзац" и другие не открываются.
- Пользователь указал, что plain editor во вкладке `Просмотр` лишний.
- Пользователь предложил явную галку `Редактирование` / `Edit`, по умолчанию выключенную.

## Нефункциональные ограничения

- Не брать file lock при read-only просмотре.
- Не запускать heartbeat без явного режима редактирования.
- Не подменять rendered editing обычным plain editor во вкладке `Просмотр`.
- Сохранить совместимость хранения Markdown как source of truth.
- Сохранить RU/EN i18n.

## Не входит в задачу

- Полный Obsidian-like CodeMirror Live Preview.
- ProseMirror/TipTap WYSIWYG.
- Создание/удаление файлов и папок.
- Drag-and-drop в дереве файлов.

## Желаемое поведение

- Файл по умолчанию открывается в read-only режиме без lock.
- Галка `Редактирование` включает lock, heartbeat, toolbar и save.
- Выключение `Редактирование` при несохранённых изменениях требует подтверждения.
- `Просмотр` при выключенном edit показывает только rendered preview.
- `Исходник` при выключенном edit показывает read-only source.
- `Две панели` при выключенном edit показывает read-only source + rendered preview.
- `Исходник` и `Две панели` при включенном edit используют editable CodeMirror.
- `Просмотр` при включенном edit не показывает plain editor; вместо этого показывает понятное состояние, что live preview editing будет отдельной задачей.
- Toolbar menus открываются как controlled popover, закрываются по Escape/click outside и работают в тестах.

## Затронутые области

- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/features/editor/MarkdownEditor.jsx`
- `web/src/features/i18n/LanguageProvider.jsx`
- `web/src/App.test.jsx`
- `web/src/styles.css`

## Заметки по реализации

- Разделить read-only file load через `readFileContent` и edit session через `createFileEditorSession`.
- Перед включением edit брать lock и перечитывать файл через session.
- При выключении edit отпускать lock.
- Для read-only source можно переиспользовать CodeMirror с `editable: false` и `readOnly: true`.
- Toolbar dropdown заменить с `<details>` на button + popover state.

## Критерии приёмки

- Открытие `.md` файла не вызывает `/locks`.
- Включение `Редактирование` вызывает `/locks`, показывает toolbar/save и lock status.
- `Просмотр` не содержит `Markdown-редактор`.
- `Исходник` и `Две панели` корректно работают в read-only и edit modes.
- Toolbar menu открывается по клику.
- Tests/build/smoke проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `./test/run-smoke.sh`
- `cd test && docker compose up -d --build`
- Ручная проверка UI на `http://127.0.0.1:18081`

## Результаты валидации

- `npm test` в `web/` — passed, 22 tests.
- `npm run build` в `web/` — passed.
- `go test ./...` — passed.
- `cd test && docker compose up -d --build` — test stack пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- `GET http://127.0.0.1:18081/healthz` — `{"status":"ok"}`.
- Playwright MCP ручная проверка:
  - `Rendered` без edit показывает только rendered preview.
  - `Plain` без edit показывает read-only CodeMirror без toolbar.
  - `Edit` включает lock и toolbar.
  - `Rendered` с edit показывает placeholder про будущий Live Preview, а не plain editor.
  - Toolbar menu `Paragraph` открывается и показывает команды.
  - После финального rebuild checkbox `Edit` отображается нормального размера.

## Откат

Откатить изменения editor/viewer UI и вернуть прежнюю session-on-open модель.
