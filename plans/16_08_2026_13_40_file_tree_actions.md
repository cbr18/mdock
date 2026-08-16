# File tree actions

Task: [16_08_2026_13_40_file_tree_actions.md](../tasks/16_08_2026_13_40_file_tree_actions.md)

## Последовательность реализации

1. Убрать текстовый заголовок workspace header.
2. Добавить состояние collapse для file list pane.
3. Добавить кнопки создания файла/папки в текущей директории.
4. Добавить row actions для папок и файлов.
5. Подключить `createFile`, `createDirectory`, `deletePath`.
6. Добавить i18n и стили.
7. Обновить frontend tests.
8. Прогнать проверки и закрыть задачу.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- Native prompt/confirm примитивны, но достаточны для MVP и позволяют быстро проверить workflow.
- Удаление директории может удалить вложенные файлы, поэтому нужен confirm.

## Заметки по откату

Откатить изменения в `VaultFilesPanel`, CSS, i18n и tests.
