# Default file root

Task: [23_08_2026_12_50_default_file_root.md](../tasks/23_08_2026_12_50_default_file_root.md)

## Последовательность реализации

1. Добавить `DEFAULT_FILE_ROOT` в backend config с default `Obsidian Vault` и документированным способом отключения.
2. Прокинуть значение config во frontend через существующий vault details/API контракт или отдельный lightweight endpoint.
3. Обновить `.env.example`, root `docker-compose.yml`, `test/.env.test.example` и deployment/server API docs.
4. Изменить `VaultFilesPanel`, чтобы стартовая директория бралась из `default_file_root`, но WebDAV URL оставался `/webdav/<slug>/`.
5. Добавить UI-переход в настоящий root vault из default root.
6. Обработать случай, когда default root ещё не существует: понятное пустое состояние и действие создания папки.
7. Обновить ru/en i18n.
8. Добавить backend/frontend tests на config/API/UI поведение.
9. Прогнать проверки.

## Проверки

- `go test ./...`
- `npm test`
- `npm run build`
- Ручная проверка: Remotely Save создаёт `Obsidian Vault/`, web UI открывает её как рабочую папку.
- Ручная проверка: настоящий root остаётся доступен.

## Риски

- Пользователь может не понять, почему WebDAV URL указывает на root, а UI открывает подпапку.
- Если default root не существует, UI не должен выглядеть как сломанное хранилище.
- Deep links должны иметь приоритет над default root, иначе ссылки на файлы вне подпапки сломаются.
- Отключение default root должно быть явно задокументировано.

## Заметки по откату

- Откатить config/API/UI changes одним revert.
- Физические файлы и папки не мигрируются, поэтому откат не требует data migration.
