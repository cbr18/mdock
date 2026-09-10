# Markdown toolbar implementation

Task: [06_09_2026_16_17_markdown_toolbar_implementation.md](../tasks/06_09_2026_16_17_markdown_toolbar_implementation.md)

## Последовательность реализации

1. Создать диспатчер `web/src/features/editor/toolbarActions.jsx`: функция `runCommand(view, text, onChange, effect)`:
   - вычисляет результат трансформации через чистую функцию из `markdownActions.js`;
   - применяет через `view.dispatch` (changes + selection);
   - отдаёт новый текст в `onChange`, чтобы обновить dirty/lock/preview.
2. Обновить `MarkdownEditor.jsx`:
   - подключить диспатчер к каждой `ToolbarButton`;
   - заменить `disabled`-заглушку на рабочее поведение;
   - командам с параметрами передать popover-форму.
3. Добавить компонент форм `ToolbarForm` (input + Apply/Cancel, Enter submit, Escape/Outside click close, роль dialog/подписи) и переиспользовать для link, image, wikilink, callout, footnote, table, metadata, code block language.
4. Добавить новые i18n-ключи (ru+en) для форм и кнопок, которых не хватает.
5. Дополнить `styles.css` минимальными стилями для popover-форм, сохраняя существующие токены.
6. Дополнить unit-тесты: диспатчер и новые кейсы `markdownActions` для команд форм.
7. Прогнать `npm test` и `npm run build`.
8. Зафиксировать результат: обновить статус задачи и roadmap.
9. Ручная проверка в running UI после пересборки контейнера: каждая группа тулбара (paragraph/inline/lists/insert) в режимах source и live.

## Проверки

- `npm test` — успешно.
- `npm run build` — успешно.
- `go test ./...` не требуется: backend не меняется.
- Ручной smoke в `http://127.0.0.1:18081` после пересборки контейнера: тулбар выполняется, save сохраняет валидный Markdown.

## Риски

- CodeMirror value приходит из пропа; если диспатчить напрямую и параллельно сработает React-controll, результат может быть перезаписан. Решение: всегда синхронизировать через `onChange`, применяя dispatch через `view.dispatch` и обновляя родительский state как единственный источник текста.
- Несовпадение позиций каретки после трансформации на больших документах. Решение: пересчитывать selection относительно результата трансформации на момент вызова, не полагаясь на устаревшие индексы.
- Popover-формы могут неудобно открываться при маленьком окне. Решение: компактные поля, фокус на первом поле, закрытие по Escape.
- Забыть перевести новые строки на оба языка. Решение: шаг 4 добавляет ru и en одним изменением; проверка отсутствия fallback-ключей.

## Заметки по откату

- Откат: revert изменений `web/src/features/editor/*`, `web/src/features/i18n/LanguageProvider.jsx`, `web/src/styles.css`, `docs/roadmap.md`.
- Отдельный удаление новых тестов и файла диспатчера.