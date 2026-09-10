# Roadmap and update script

Task: [23_08_2026_15_43_roadmap_and_update_script.md](../tasks/23_08_2026_15_43_roadmap_and_update_script.md)

## Последовательность реализации

1. Создать `docs/roadmap.md` с release-oriented roadmap.
2. Зафиксировать ближайшую очередь: mobile/adaptive audit, mobile layout fixes, Git history UI, Markdown toolbar.
3. Добавить `scripts/update.sh` с режимами `--help`, `--check`, `--apply`, `--target`, `--branch`, `--yes`.
4. Обновить README и release strategy ссылками на roadmap/update flow.
5. Проверить shell syntax и check mode.
6. Обновить task результатами.

## Проверки

- `bash -n scripts/update.sh`
- `scripts/update.sh --help`
- `scripts/update.sh --check`

## Риски

- Для private GitHub repo `git ls-remote https://github.com/cbr18/mdock.git` может требовать credentials.
- Если production checkout имеет локальные изменения, update должен остановиться.
- Если нет release tags, latest version может быть недоступна; script должен объяснить это явно.

## Заметки по откату

- Изменения не затрагивают БД и runtime-state.
- Откат обычным revert файлов документации и `scripts/update.sh`.
