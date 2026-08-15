# File API для web editor

Status: DONE
Created: 2026-08-15 21:48
Project: mdock
Plan: [15_08_2026_21_48_file_api_for_web_editor.md](../plans/15_08_2026_21_48_file_api_for_web_editor.md)

## Проблема

Web UI уже показывает vaults, git status, commits и admin-функции, но не умеет работать с файлами vault через JSON API. Для следующего шага с деревом файлов и markdown editor нужен стабильный backend contract поверх существующих `vault`, `locks` и `git` слоёв.

## Доказательства

- `docs/server-api.md` описывает auth, vaults, admin и git endpoints, но не описывает JSON file API.
- `internal/vault` содержит path-safety groundwork, но HTTP API для файлов отсутствует.
- WebDAV умеет читать/писать файлы, но web editor не должен ходить через WebDAV.

## Нефункциональные ограничения

- Все операции должны оставаться внутри корня конкретного vault.
- Доступ к `.git` через API запрещён.
- SQL-запросы и path handling не должны использовать строковую интерполяцию пользовательского ввода.
- Mutating endpoints требуют web session и CSRF, как остальные JSON API.
- File locks должны быть лёгкими advisory locks, не блокировать весь vault и не блокировать независимые файлы.
- Git queue trigger должен происходить после успешных mutating file operations.
- API не должен логировать содержимое приватных файлов, пароли, session ids или auth headers.

## Не входит в задачу

- Frontend file tree/editor.
- Markdown preview/rendering.
- Wikilinks/backlinks/embeds/mermaid.
- Shared vault permissions beyond current membership checks.
- Полнотекстовый поиск.
- Binary preview/upload UI.

## Желаемое поведение

- Web client может получить дерево файлов vault.
- Web client может прочитать текстовый файл.
- Web client может создать файл или директорию.
- Web client может записать текстовый файл.
- Web client может переименовать/переместить файл или директорию.
- Web client может удалить файл или директорию.
- Web editor может взять, продлить и отпустить lock на конкретный файл.
- Запись в файл с активным lock другого owner возвращает явную ошибку.
- После успешных изменений git queue получает событие с source `web`.

## Затронутые области

- `internal/vault/`
- `internal/locks/`
- `internal/httpapi/`
- `internal/app/`
- `docs/server-api.md`
- `test/smoke/`

## Заметки по реализации

- Использовать текущую слоистую архитектуру: HTTP boundary вызывает app/service, app вызывает vault/locks/git/store.
- Для list endpoint вернуть плоский список или дерево, достаточное для web UI. MVP contract: entries с `path`, `name`, `type`, `size`, `mod_time`.
- Для content endpoint ограничить MVP текстовыми файлами и лимитом размера из config/body limit.
- Для lock owner использовать web session/user-derived owner id, чтобы конфликт отличался от WebDAV transient writes.
- Move/delete directory должны быть осторожными: path safety для source и destination, запрет `.git`.
- Git trigger source: `web`.

## Критерии приёмки

- Member vault может list/read/write/create/move/delete внутри своего vault.
- Non-member не имеет доступа.
- Path traversal и `.git` access отклоняются.
- Lock conflict возвращает явную ошибку и не перезаписывает файл.
- После web write git status/commits отражают изменение после debounce.
- Tests и smoke проходят.

## План тестирования

- `go test ./...`
- `npm test`
- `npm run build` из `web/`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- Проверка логов test stack на 5xx, panic, `database is locked` и auth-secret leaks.

## Результаты валидации

- `go test ./...` — passed.
- `go test -tags smoke ./test/smoke -run '^$'` — passed, smoke package compiles.
- `npm test` из `web/` — passed, `4` теста.
- `npm run build` из `web/` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — test stack пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml ps` — контейнер `healthy`, порт `18080`.
- Логи test stack проверены фильтром по `status.:5`, `panic`, `database is locked`, `Authorization`, `Basic`, `password`, `Cookie`, `Set-Cookie`, `level.:ERROR`: найденные совпадения содержат только path endpoints `/api/auth/password` и `/api/admin/users/.../password`, значения секретов не логируются; 5xx/panic/database lock не обнаружены.

## Связанные коммиты

- `d4cd510` — Add web file API.

## Откат

Откатить добавленные file API endpoints, tests и docs. Не удалять пользовательские vault directories, SQLite data и Docker volumes.
