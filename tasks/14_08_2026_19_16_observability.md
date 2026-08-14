# Server observability

Status: CREATED
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

## Критерии приёмки

- `/readyz` работает.
- Logs полезны и не содержат секретов.
- Tests проходят.

## План тестирования

- `go test ./...`
- `./test/run-smoke.sh`

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить endpoints/middleware.
