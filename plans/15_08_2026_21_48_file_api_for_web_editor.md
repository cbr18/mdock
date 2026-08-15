# File API для web editor

Task: [15_08_2026_21_48_file_api_for_web_editor.md](../tasks/15_08_2026_21_48_file_api_for_web_editor.md)

## Последовательность реализации

1. Инвентаризировать текущие `vault`, `locks`, `git registry`, `app service` и `httpapi` interfaces.
2. Расширить `vault` слой безопасными file operations: list, read text, write text, mkdir, move, delete.
3. Добавить application methods, которые проверяют membership, lock conflict и ставят git queue source `web`.
4. Добавить HTTP endpoints под `/api/vaults/{slug}/files`.
5. Добавить lock endpoints для web editor.
6. Обновить `docs/server-api.md`.
7. Добавить unit/API/smoke tests.
8. Прогнать проверки и обновить task validation.

## Проверки

- `go test ./...`
- `npm test`
- `npm run build` из `web/`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- `docker logs mdock_test-mdock-1 --tail 200`

## Риски

- Path handling может случайно разрешить traversal или `.git`.
- Lock semantics можно сделать слишком тяжёлыми и заблокировать независимые файлы.
- Directory move/delete может неожиданно затронуть много файлов; MVP должен явно ограничить опасные случаи, если реализация получается неоднозначной.
- Git debounce может сделать тесты flaky, если smoke не ждёт commit достаточно явно.

## Заметки по откату

Откатить endpoints/service/vault changes и документацию. Данные vault не трогать.
