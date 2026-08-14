# Server architecture cleanup

Task: [14_08_2026_19_09_server_architecture_cleanup.md](../tasks/14_08_2026_19_09_server_architecture_cleanup.md)

## Последовательность реализации

1. Зафиксировать текущие server responsibilities и публичные routes.
2. Создать application service:
   - зависимости `store`, `vault.Service`, `git.Client`, `locks.Service`;
   - use cases `RegisterUser`, `Login`, `Logout`, `CurrentUser`, `ListVaults`, `CreateVault`;
   - `PrepareVault` и `QueueForVault`.
3. Вынести git queue registry из `internal/server` в application/git boundary.
4. Создать HTTP API boundary:
   - router;
   - auth handlers;
   - vault handlers;
   - session middleware;
   - JSON helpers/context user helpers.
5. Вынести static frontend handler в отдельный файл/тип.
6. Оставить `server.New` как тонкий composition root для HTTP handler, чтобы `cmd/mdock` менялся минимально.
7. Проверить, что WebDAV wiring получает те же зависимости и behavior не меняется.
8. Обновить docs при необходимости.
9. Прогнать tests/smoke.

## Проверки

- `go test ./...`
- `npm test` из `web/`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- Проверка логов test stack на `database is locked`, 5xx и auth leaks.

## Риски

- Можно случайно изменить HTTP response shape/status codes.
- Можно нарушить session cookie behavior.
- WebDAV может потерять queue/lock dependency при переносе wiring.
- Излишне широкий refactor может смешаться с vault model cleanup; эту задачу нужно держать механической.

## Заметки по откату

Откатить новые `app/httpapi` файлы и вернуть composition в `internal/server`. Не трогать пользовательские данные.
