# Default file root

Status: DONE
Created: 2026-08-23 12:50
Project: mdock
Plan: [23_08_2026_12_50_default_file_root.md](../plans/23_08_2026_12_50_default_file_root.md)

## Проблема

Obsidian Remotely Save по умолчанию создаёт подпапку с именем локального vault, например `Obsidian Vault/`. Из-за этого в web UI mdock пользователь видит лишний верхний уровень, хотя фактическая рабочая область заметок для Obsidian находится внутри этой подпапки.

## Доказательства

- В production логах Remotely Save ходит в `/webdav/cbr/Obsidian Vault/`.
- Пользователь хочет, чтобы в браузере по умолчанию открывалась рабочая папка Remotely Save, но WebDAV доступ к настоящему `/webdav/<slug>/` при этом сохранялся.
- Обсуждённое имя настройки: `DEFAULT_FILE_ROOT`.

## Нефункциональные ограничения

- Не менять WebDAV protocol root: `/webdav/<slug>/` должен остаться доступен как настоящий root vault.
- Не делать магическое strip/rename WebDAV путей в этой задаче.
- Не ломать существующие vaults без папки `DEFAULT_FILE_ROOT`.
- Не скрывать возможность перейти в настоящий root vault.
- Не хардкодить `Obsidian Vault` в UI-компонентах, кроме значения config default.
- Сохранять i18n ru/en для новых UI строк.

## Не входит в задачу

- Миграция существующих файлов между root и `Obsidian Vault/`.
- Server-side path rewrite для WebDAV.
- Настройки per-vault/per-user.
- Автоматическое определение имени локального Obsidian vault.
- Изменение Remotely Save настроек.

## Желаемое поведение

- Добавить config/env `DEFAULT_FILE_ROOT`.
- Если `DEFAULT_FILE_ROOT` не задан, использовать значение по умолчанию `Obsidian Vault`.
- Web UI файлового дерева по умолчанию открывает и показывает `DEFAULT_FILE_ROOT` как рабочую папку хранилища.
- Если папки `DEFAULT_FILE_ROOT` ещё нет, UI должен показывать понятное пустое состояние и позволять создать/открыть настоящий root.
- Должна быть доступна навигация в настоящий root vault, чтобы пользователь мог увидеть служебные/другие папки.
- WebDAV URLs в UI остаются `/webdav/<slug>/`, потому что протокольный root не меняется.
- API должен отдавать frontend значение `default_file_root`, чтобы UI не дублировал server config.

## Затронутые области

- `internal/config/config.go`
- `internal/httpapi` handlers для config/details endpoint
- `internal/server/server_test.go`
- `.env.example`
- `docker-compose.yml`
- `test/.env.test.example`
- `docs/deployment.md`
- `docs/server-api.md`
- `docs/vault-server-tz.md` при необходимости
- `web/src/pages/VaultPage.jsx`
- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/features/i18n/LanguageProvider.jsx`
- `web/src/api/*`
- `web/src/App.test.jsx`
- `tasks/`
- `plans/`

## Заметки по реализации

- Config default: `DefaultFileRoot: "Obsidian Vault"`.
- Env name: `DEFAULT_FILE_ROOT`.
- Отключение default root фиксируется значением `DEFAULT_FILE_ROOT=.`. Пустая строка в текущем env parser считается unset и даёт fallback `Obsidian Vault`.
- Для MVP можно передавать `default_file_root` в `GET /api/vaults/{slug}` вместе с `webdav`.
- `VaultFilesPanel` должен принимать `defaultRoot` и стартовать с него вместо `.`.
- Если `listFiles(slug, defaultRoot)` вернул `404`, показать пустое состояние с действиями `Создать папку` и `Открыть корень`.
- URL deep link с `file=` должен открывать конкретный файл независимо от default root.
- Breadcrumbs должны явно показывать, что пользователь находится внутри default root.

## Критерии приёмки

- Без env UI по умолчанию открывает `Obsidian Vault`.
- С `DEFAULT_FILE_ROOT=notes` UI по умолчанию открывает `notes`.
- С отключённым default root UI открывает настоящий root.
- WebDAV `/webdav/<slug>/` продолжает работать без rewrite.
- Пользователь может перейти из default root в настоящий root.
- Deep link на файл вне default root работает.
- `.env.example`, compose и docs обновлены.
- `npm test` проходит.
- `npm run build` проходит.
- `go test ./...` проходит.

## План тестирования

- `go test ./...`
- `npm test`
- `npm run build`
- Проверить config env parsing для unset/custom/disabled values.
- Проверить API response с `default_file_root`.
- Проверить frontend: стартовая папка default root, fallback при 404, переход в настоящий root.
- После реализации на test/prod вручную проверить WebDAV URL и отображение дерева после Remotely Save sync.

## Результаты валидации

- `go test ./...` — passed.
- `npm test` — passed, 30 tests.
- `npm run build` — passed.

## Commits

- Не создано: реализация подготовлена локально, пользователь попросил пока без push.

## Откат

- Убрать `DEFAULT_FILE_ROOT` из config/env/docs.
- Вернуть `VaultFilesPanel` к старту из `.`.
- Данные в vault не менять и не удалять.
