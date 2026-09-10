# File deeplinks and new tab navigation

Task: [22_08_2026_12_20_file_deeplinks_new_tab.md](../tasks/22_08_2026_12_20_file_deeplinks_new_tab.md)

## Последовательность реализации

1. Добавить helper для построения file URL с сохранением `page`, `slug`, `section=editor`, `file`, `view`.
2. Заменить файловый open control в дереве на `<a href>`, оставив папки кнопками.
3. Добавить native-navigation guard для Ctrl/Cmd/middle/context behavior.
4. При обычном клике по файлу обновлять URL через `history.pushState` и открывать файл через текущий loader.
5. Добавить синхронизацию с `popstate`: читать `file` и `view`, открывать файл из URL.
6. Для deep link подгружать parent directories перед поиском entry.
7. Обновить frontend tests под role `link` и добавить проверки href/deep link.
8. Зафиксировать в task, что Confluence-like drafts не входят в MVP.
9. Прогнать проверки.

## Проверки

- `npm test` — успешно.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.

## Риски

- Возможен race между загрузкой дерева и открытием файла из URL.
- При unsaved changes переход на другой файл должен не терять данные без confirm.
- URL encoding вложенных путей должен быть совместим с текущими API calls.

## Заметки по откату

Откатить frontend changes и тесты. Backend, БД и файлы хранилищ не требуют отката.
