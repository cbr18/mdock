# Markdown editor logic

Task: [16_08_2026_12_17_markdown_editor_logic.md](../tasks/16_08_2026_12_17_markdown_editor_logic.md)

## Последовательность реализации

1. Расширить `web/src/api/files.js` wrappers для write/create/move/delete/lock/heartbeat/release.
2. Добавить pure Markdown action helpers.
3. Покрыть helpers unit tests.
4. Добавить минимальный lock/save lifecycle helper или hook без визуального UI.
5. Обновить документацию при уточнении contract.
6. Прогнать проверки и обновить task validation.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- Markdown transforms могут ломать сложные nested selections.
- Lock heartbeat в тестах может быть flaky, если завязать его на реальные timers; использовать fake timers.

## Заметки по откату

Удалить editor logic/helpers/tests и вернуть API files wrapper к предыдущему виду.
