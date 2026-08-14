Status: DONE

# Git Shutdown And Policy

Plan: [14_08_2026_22_59_git_shutdown_and_policy.md](../plans/14_08_2026_22_59_git_shutdown_and_policy.md)

## Проблема

В git-стратегии vault'ов не закрыты несколько operational деталей: graceful shutdown очередей, формат commit message, политика бинарников и auto-push retry/backoff.

## Доказательства

- `cmd/mdock/main.go` делает HTTP shutdown, но не закрывает все git queues.
- `internal/git.Queue.flush` использует общий формат `sync: update N files` без источника.
- `docs/git-vaults.md` не фиксирует решение по вложениям/бинарникам и retry remote push.

## Нефункциональные ограничения

- Не вводить durable queue в этой задаче.
- Не добавлять auto-push implementation.
- Не добавлять `.gitignore`-политику, которая может сломать Obsidian attachments.
- Shutdown не должен ждать бесконечно.

## Не входит в задачу

- App-passwords.
- Shared vaults.
- File tree API.
- Auto-push worker.
- Размерные лимиты файлов.

## Желаемое поведение

- При SIGTERM/SIGINT сервер сначала останавливает приём HTTP-запросов, затем закрывает git queues и flush'ит pending changes.
- Текущая git-операция по vault завершается или прерывается по shutdown timeout.
- Commit message различает источник: `sync(webdav): update 1 file`, `sync(web): update 2 files`, `recovery: uncommitted changes on startup`.
- MVP явно коммитит всё содержимое vault, включая бинарные attachments.
- Auto-push retry/backoff в MVP отсутствует: следующая ручная команда или будущий триггер попробует снова.

## Затронутые области

- `cmd/mdock`
- `internal/app`
- `internal/git`
- `docs/git-vaults.md`
- `tasks`
- `plans`

## Заметки по реализации

- Добавить `QueueRegistry.CloseAll(ctx)`.
- Добавить `Service.Shutdown(ctx)`.
- В `main` вызвать shutdown очередей после `httpServer.Shutdown`.
- В queue сохранять source по pending paths и строить commit message на flush.
- Если источников несколько в одном debounce-window, использовать `sync(mixed)`.

## Критерии приёмки

- `go test ./...` проходит.
- `docs/git-vaults.md` описывает graceful shutdown, commit messages, binaries policy и remote retry policy.
- Task содержит commit hash после завершения.

## План тестирования

- Unit-тесты git queue message/source.
- `go test ./...`.

## Результаты валидации

- `go test ./...` — пройдено.
- `go vet ./...` — пройдено.
- `npm test` — пройдено.
- `npm run build` — пройдено.
- `docker compose config` — пройдено.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` — пройдено.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — test stack пересобран и поднят.
- `./test/run-smoke.sh` — пройдено.
- Логи test stack проверены: нет `panic`, `database is locked`, 5xx, auth/cookie/password leaks.

## Откат

- Откатить commit задачи.

## Commits

- `4dd897d` — Harden git queue shutdown policy.
