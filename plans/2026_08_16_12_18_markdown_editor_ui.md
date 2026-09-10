# Markdown editor UI

Task: [16_08_2026_12_18_markdown_editor_ui.md](../tasks/16_08_2026_12_18_markdown_editor_ui.md)

## Последовательность реализации

1. Прочитать и применить `web-design-guidelines`.
2. Спроектировать компоненты editor toolbar/popovers/status.
3. Подключить CodeMirror 6 к `VaultFilesPanel`.
4. Подключить lock/save lifecycle.
5. Подключить toolbar actions из editor logic.
6. Добавить i18n ключи и стили через theme tokens.
7. Добавить/обновить frontend tests.
8. Прогнать проверки и обновить task validation.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- Ручной smoke сохранения файла.

## Риски

- Большой toolbar может перегрузить мобильный экран.
- CodeMirror selection mapping требует аккуратной интеграции с pure transforms.
- Popover forms должны закрываться предсказуемо и не терять фокус редактора.

## Заметки по откату

Откатить UI-компоненты и интеграцию, сохранить документацию требований.
