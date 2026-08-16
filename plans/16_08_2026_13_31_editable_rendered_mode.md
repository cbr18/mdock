# Editable rendered mode

Task: [16_08_2026_13_31_editable_rendered_mode.md](../tasks/16_08_2026_13_31_editable_rendered_mode.md)

## Последовательность реализации

1. Выделить общий lazy editor render helper.
2. Изменить `rendered` mode на editable composition: editor + rendered preview.
3. Оставить `plain` как editor-only.
4. Оставить `split` как editor + preview.
5. Обновить frontend test.
6. Прогнать проверки и закрыть задачу.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- Пользователь ожидает настоящий WYSIWYG, а не editable source + preview. Это отдельная архитектурная работа: CodeMirror Live Preview decorations или ProseMirror/TipTap с Markdown serializer.

## Заметки по откату

Откатить изменения `DocumentView` и тестов.
