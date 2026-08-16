# Explicit file edit mode

Task: [16_08_2026_14_26_explicit_file_edit_mode.md](../tasks/16_08_2026_14_26_explicit_file_edit_mode.md)

## Последовательность реализации

1. Обновить `MarkdownEditor`: добавить `readOnly`, controlled toolbar popovers, Escape/outside close.
2. Обновить `VaultFilesPanel`: разделить read-only file load и edit session with lock.
3. Добавить edit toggle и confirmation при выходе из edit с dirty state.
4. Изменить `DocumentView` режимы: preview/source/split с учётом `editing`.
5. Добавить RU/EN строки.
6. Обновить frontend tests.
7. Прогнать проверки и пересобрать test stack.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `./test/run-smoke.sh`
- `cd test && docker compose up -d --build`

## Риски

- Переключение edit mode может перечитать файл и скрыть внешние изменения, если пользователь ожидает мгновенного merge.
- Настоящий rendered editing всё ещё требует отдельной CodeMirror Live Preview задачи.
- Read-only CodeMirror должен не показывать save toolbar, иначе UI будет выглядеть редактируемым.

## Заметки по откату

Откатить `VaultFilesPanel`, `MarkdownEditor`, tests/styles/i18n этой задачи.
