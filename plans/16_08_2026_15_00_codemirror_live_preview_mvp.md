# CodeMirror Live Preview MVP

Task: [16_08_2026_15_00_codemirror_live_preview_mvp.md](../tasks/16_08_2026_15_00_codemirror_live_preview_mvp.md)

## Последовательность реализации

1. Добавить `livePreviewExtension.js` с decorations для MVP markdown constructs.
2. Добавить `variant` в `MarkdownEditor` и подключать live extension только для `variant="live"`.
3. Заменить placeholder в `VaultFilesPanel` на live editor.
4. Добавить CSS classes для live preview.
5. Обновить tests на `Просмотр + Редактирование`.
6. Прогнать проверки, пересобрать test stack и проверить UI.
7. Обновить task validation и сделать commit.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `./test/run-smoke.sh`
- `cd test && docker compose up -d --build`

## Риски

- Decorations могут ухудшить caret UX, если скрывать markers слишком агрессивно.
- Regex decorations не должны превращаться в тяжёлую обработку всего файла.
- CodeMirror layout в jsdom может требовать существующих test polyfills.

## Заметки по откату

Удалить live extension, вернуть `Просмотр + Редактирование` к placeholder.
