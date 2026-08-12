# Инициализация скелета проекта

Status: DONE
Created: 2026-08-12 08:05
Project: mdock
Plan: [12_08_2026_08_05_init_project_skeleton.md](../plans/12_08_2026_08_05_init_project_skeleton.md)

## Проблема

Проект пока содержит только документацию и правила для агента. Нужно создать стартовый рабочий скелет приложения self-hosted markdown vault server, чтобы дальше можно было развивать backend, frontend, WebDAV, git-слой и auth инкрементально, не меняя базовую структуру.

Отдельно нужно сразу заложить Docker-разделение:

- `docker-compose.yml` в корне — production stack;
- `./test/docker-compose.yml` — dev/test stack;
- тесты должны уметь валидировать проект, запущенный через `./test`.

## Доказательства

- [docs/vault-server-tz.md](../docs/vault-server-tz.md) фиксирует MVP: Go backend, React/Vite frontend, SQLite, git CLI, WebDAV, встроенный auth.
- [docs/tech-stack.md](../docs/tech-stack.md) фиксирует планируемые библиотеки и инструменты.
- В репозитории пока нет `go.mod`, frontend-проекта, Dockerfile, compose-файлов, тестовой инфраструктуры и исполняемого приложения.

## Нефункциональные ограничения

- Не запускать Docker в рамках создания этой задачи без отдельного запроса пользователя.
- Root `docker-compose.yml` должен описывать production stack.
- `./test/docker-compose.yml` должен описывать dev/test stack и не смешиваться с production volumes/data.
- Vault data и application data должны быть разнесены по разным mount points.
- Production и test stack не должны использовать одни и те же volume names.
- MVP должен собираться как один Go-бинарник с embedded frontend static assets.
- В dev frontend должен запускаться отдельно через Vite dev server с hot-reload, backend отдельно.
- Не добавлять git remote sync в init-итерацию.
- Не добавлять CRDT/Yjs, multi-user sharing и app-passwords в init-итерацию.
- Не хранить секреты в репозитории.
- Не логировать пароли, session ids, auth headers и приватное содержимое файлов.

## Не входит в задачу

- Полная реализация WebDAV filesystem wrapper.
- Полная реализация git queue/autocommit.
- Полная реализация markdown editor UI.
- Полная реализация file tree/file operations UI.
- Git remote backup/sync.
- Multi-user sharing и CRDT.
- Production deployment на внешний сервер.
- Настройка nginx/Authelia/Authentik.
- Реальные TLS certificates.

## Желаемое поведение

После init-итерации в проекте должен быть минимальный, запускаемый и тестируемый скелет:

- Go backend с health endpoint.
- React/Vite frontend.
- Production build path, где frontend static assets встраиваются в Go binary через `embed.FS`.
- SQLite initialization с WAL mode.
- Config loading из env.
- Bootstrap admin-пользователя через env при первом запуске.
- Минимальная auth/session основа, достаточная для будущего web login.
- Базовая структура backend-пакетов под API, auth, storage, git, locks и WebDAV.
- Dockerfile для production image.
- Root `docker-compose.yml` для production stack.
- `./test/docker-compose.yml` для dev/test stack.
- `.env.example` для production/self-hosted параметров.
- `./test/.env.test.example` для test stack.
- Скрипты или команды для запуска тестов против поднятого `./test` stack.
- README или docs-раздел с командами dev/prod/test запуска.

## Затронутые области

- `cmd/mdock/`
- `internal/config/`
- `internal/http/`
- `internal/auth/`
- `internal/storage/`
- `internal/git/`
- `internal/locks/`
- `internal/webdav/`
- `web/`
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `test/docker-compose.yml`
- `test/.env.test.example`
- `test/`
- `docs/`
- `README.md`

Фактическая структура может отличаться, если в процессе реализации будет найден более простой вариант, но она должна оставаться совместимой с ТЗ и tech stack.

## Заметки по реализации

- Go module name выбрать при старте реализации. Рабочее имя проекта в документах: `mdock`.
- Backend начинать с `net/http` + `go-chi/chi/v5`.
- SQLite driver по умолчанию: `modernc.org/sqlite`, чтобы сохранить сборку без CGO.
- Password hashing по умолчанию: `bcrypt`.
- Frontend: React + Vite + CodeMirror 6.
- Styling: CSS Modules или plain CSS, без Tailwind/MUI/Chakra на init-итерации.
- Syntax highlight для markdown preview: `rehype-highlight`.
- Config должен читаться из env, чтобы Docker и `.env` были основным способом настройки.
- Production compose должен монтировать:
  - vaults root в `/vaults`;
  - data-dir в `/data`.
- Test compose должен использовать отдельные пути/volumes, например:
  - `/test/vaults`;
  - `/test/data`;
  - отдельный compose project name.
- Test stack должен быть пригоден для integration/smoke тестов через HTTP.
- Если frontend dependencies требуют lockfile, lockfile можно создать только как часть явной инициализации frontend-проекта.

## Критерии приёмки

- `go test ./...` проходит.
- Frontend unit/build checks проходят из `web/`.
- Production frontend build может быть встроен в Go binary.
- Go binary стартует с env-конфигом и отвечает на health endpoint.
- SQLite создаётся в `DATA_DIR`, включает WAL mode и применяет начальную схему.
- Bootstrap user создаётся при первом запуске из env и не перезаписывается при повторном запуске.
- Root `docker-compose.yml` проходит `docker compose config`.
- `test/docker-compose.yml` проходит `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`.
- Test stack содержит команды/документацию для запуска проекта через `./test`.
- Интеграционные/smoke тесты умеют проверять health/auth базу против сервиса, запущенного через `./test/docker-compose.yml`.
- Production и test compose не используют одинаковые named volumes для vault/data.
- Документация содержит команды для:
  - dev запуска backend/frontend;
  - production Docker запуска;
  - test stack запуска;
  - тестов против test stack.

## План тестирования

- `go test ./...`
- `cd web && npm test`
- `cd web && npm run build`
- `go build -buildvcs=false ./cmd/mdock`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- Запуск test stack вручную после реализации:
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
  - дождаться health endpoint;
  - запустить integration/smoke тесты против HTTP endpoint test stack;
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down`
- Smoke checks против поднятого `./test` проекта:
  - health endpoint возвращает success;
  - login endpoint принимает bootstrap user;
  - session cookie выдаётся и позволяет открыть protected API;
  - SQLite файл создан в test data-dir;
  - vault path доступен приложению;
  - `.git` и path traversal endpoints не доступны через API.

## Результаты валидации

- `go test ./...` прошёл:
  - config tests;
  - SQLite/WAL/auth/session tests;
  - server health/login/session tests;
  - path safety tests;
  - git queue skeleton tests;
  - locks skeleton tests.
- `go build -buildvcs=false -o /tmp/mdock ./cmd/mdock` прошёл.
- `go test -run '^$' -tags smoke ./test/smoke` прошёл, smoke-тесты компилируются без запуска.
- `cd web && npm test` прошёл.
- `cd web && npm run build` прошёл, frontend собран в `webdist/dist`.
- `cd web && npm audit` прошёл, у frontend dependencies 0 known vulnerabilities.
- `docker compose config` прошёл для root production compose.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` прошёл для test compose.
- Production Docker stack проверен:
  - `docker compose up -d --build` прошёл;
  - контейнер `mdock-mdock-1` стартовал и стал `healthy`;
  - `GET http://127.0.0.1:8080/healthz` вернул `{"status":"ok"}`;
  - login через `admin` / `change-me` вернул session cookie;
  - `GET /api/auth/me` с session cookie вернул `{"username":"admin"}`;
  - stack остановлен через `docker compose down` без удаления volumes.
- Test Docker stack проверен:
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` прошёл;
  - контейнер `mdock_test-mdock-1` стартовал и стал `healthy`;
  - `GET http://127.0.0.1:18080/healthz` вернул `{"status":"ok"}`;
  - `./test/run-smoke.sh` прошёл против поднятого test stack;
  - stack остановлен через `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down` без удаления volumes.
- Dockerfile переведён на сборку Go через `vendor/` и `go build -mod=vendor`, потому что `go mod download` внутри Docker дважды упал на `TLS handshake timeout` до `proxy.golang.org`. Это убирает сетевую зависимость backend stage при Docker build.
- После добавления `vendor/` повторно прошли:
  - `go test ./...`;
  - `go build -mod=vendor -buildvcs=false -o /tmp/mdock ./cmd/mdock`.
- Git status/diff не выполнялись: `/home/cbr/mdock` сейчас не является git-репозиторием.

## Откат

Удалить init-скелет, compose-файлы, generated frontend artifacts и зависимости, добавленные этой задачей. Данные production/test volumes не удалять без отдельного явного запроса.
