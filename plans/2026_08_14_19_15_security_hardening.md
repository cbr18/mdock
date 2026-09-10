# Server security hardening

Task: [14_08_2026_19_15_security_hardening.md](../tasks/14_08_2026_19_15_security_hardening.md)

## Последовательность реализации

1. Добавить body limits.
2. Добавить security headers.
3. Добавить auth rate limit.
4. Добавить CSRF для session API.
5. Добавить tests/docs.

## Проверки

- `go test ./...`
- `npm test`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Риски

- CSRF/CORS легко сломать для frontend или WebDAV.

## Заметки по откату

Откатить middleware.
