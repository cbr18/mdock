# Server architecture cleanup

Status: DONE
Created: 2026-08-14 19:09
Project: mdock
Plan: [14_08_2026_19_09_server_architecture_cleanup.md](../plans/14_08_2026_19_09_server_architecture_cleanup.md)

## Проблема

`internal/server/server.go` стал god-file: routing, REST API, auth/session middleware, cookie logic, vault management, git queue registry, static frontend fallback и WebDAV wiring живут в одном пакете/файле. Это нормально для MVP, но дальше серверные функции будет трудно добавлять без смешивания слоёв.

## Доказательства

- `internal/server/server.go` содержит `register`, `login`, `logout`, `vaults`, `createVault`, `requireSession`, `prepareVault`, `queueRegistry`, static handler и router wiring.
- Git queue registry находится в `server`, хотя это application/infrastructure concern.
- DTO для auth/vault API объявлены прямо в server file.
- Слои в ТЗ уже зафиксированы как слоистая архитектура, но текущий HTTP слой слишком широкий.

## Нефункциональные ограничения

- Не менять внешний API без необходимости.
- Не менять SQLite schema в этой задаче.
- Не менять WebDAV behavior, кроме механического переноса кода.
- Не ломать embedded frontend.
- Сохранить текущие тесты и smoke tests.
- Не делать opportunistic refactor вне server/app boundary.

## Не входит в задачу

- Vault model cleanup.
- Новые API endpoints.
- Admin UI/API.
- Remote git backup.
- Изменение auth модели.

## Желаемое поведение

- HTTP API разнесён по feature handlers.
- Application use cases вынесены из HTTP boundary.
- Git queue registry вынесен из `server`.
- Static frontend handler отделён от API/WebDAV routing.
- Текущий публичный behavior сохраняется.

## Затронутые области

- `internal/server/`
- `internal/httpapi/` или эквивалентный новый пакет
- `internal/app/`
- `internal/git/`
- `cmd/mdock/`
- `test/smoke/`

## Заметки по реализации

- Делать перенос маленькими шагами с сохранением tests после каждого крупного move.
- Предпочтительно оставить `server.New` как compatibility facade, если это уменьшит blast radius.
- В `app` вынести `RegisterUser`, `Login`, `CreateVault`, `PrepareVault`, `QueueForVault`.
- В `httpapi` вынести router, handlers, middleware, static handler.
- Queue registry можно вынести в `internal/git` или `internal/app`.

## Критерии приёмки

- `internal/server/server.go` больше не содержит всю бизнес-логику API одним файлом.
- Существующие routes работают без изменения contract.
- `go test ./...` проходит.
- `npm test` из `web/` проходит.
- `./test/run-smoke.sh` проходит.
- Remotely Save smoke остаётся зелёным.

## План тестирования

- `go test ./...`
- `npm test` из `web/`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- `go test ./...` — успешно.
- `npm test` из `web/` — успешно, `2` теста.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно, включая Remotely Save compatibility matrix.
- Логи test stack проверены фильтром по `database is locked`, `level=ERROR`, `status=5xx`, `panic`, `Authorization`, `Basic`, `password`, `Cookie`, `Set-Cookie` — совпадений нет.
- `internal/server` теперь thin composition facade.
- Application use cases вынесены в `internal/app`.
- HTTP boundary вынесен в `internal/httpapi`.
- Git queue registry вынесен в `internal/git`.

## Откат

Откатить перенос пакетов/файлов к предыдущему `internal/server` состоянию. Данные SQLite, vault directories и Docker volumes не удалять.
