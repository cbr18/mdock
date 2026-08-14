# Server observability

Status: DONE
Created: 2026-08-14 19:16
Project: mdock
Plan: [14_08_2026_19_16_observability.md](../plans/14_08_2026_19_16_observability.md)

## Проблема

Есть `/healthz` и WebDAV access logs, но нет readiness, API request logs, git queue visibility и structured operational status.

## Доказательства

- `/healthz` только отвечает `ok`.
- Git queue errors можно увидеть только из памяти/логов.

## Нефункциональные ограничения

- Не логировать секреты.
- Не добавлять тяжёлую observability stack в MVP.

## Не входит в задачу

- Prometheus/Grafana deployment.
- Distributed tracing.

## Желаемое поведение

- `/readyz` проверяет SQLite/vault root.
- API/WebDAV request logs единообразны.
- Git queue errors видны через logs/API.

## Затронутые области

- `httpapi`
- `app/git`
- `config`
- docs/tests

## Заметки по реализации

- Начать с lightweight structured logs and readiness.
- Добавлен `/readyz`: проверяет SQLite ping и доступность vault root.
- Добавлен API request logging middleware: method, path без query string, status, duration; `/healthz` не логируется, `/webdav/*` не дублируется, потому что WebDAV handler уже пишет специализированный access log.
- Git queue status уже доступен через `/api/vaults/{slug}/git/status` с `queue_len` и `last_error`.

## Критерии приёмки

- `/readyz` работает.
- Logs полезны и не содержат секретов.
- Tests проходят.

## План тестирования

- `go test ./...`
- `npm test`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- `go test ./...` — passed.
- `npm test` в `web/` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — контейнер пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- Логи `mdock_test-mdock-1` просмотрены: API и WebDAV request logs есть; query string, cookies, Authorization, пароли и body не логируются; 5xx, panic и `database is locked` не обнаружены.

## Откат

Откатить endpoints/middleware.
