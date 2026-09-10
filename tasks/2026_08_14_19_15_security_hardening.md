# Server security hardening

Status: DONE
Created: 2026-08-14 19:15
Project: mdock
Plan: [14_08_2026_19_15_security_hardening.md](../plans/14_08_2026_19_15_security_hardening.md)

## Проблема

MVP уже имеет auth и path safety, но серверу нужны дополнительные базовые меры: rate limit, CSRF, body limits, security headers и audit logging policy.

## Доказательства

- Login/WebDAV Basic Auth пока без rate limiting.
- Session API без CSRF защиты.
- JSON body limits не централизованы.

## Нефункциональные ограничения

- Не логировать секреты.
- Не ломать Remotely Save CORS/WebDAV.
- Security defaults должны быть self-hosted friendly.

## Не входит в задачу

- External auth proxy.
- OIDC/LDAP.
- Full audit compliance.

## Желаемое поведение

- Login/WebDAV auth rate limited.
- Session API защищён от CSRF.
- Request body limits централизованы.
- Security headers добавлены.

## Затронутые области

- `httpapi`
- `webdav`
- `config`
- docs/tests

## Заметки по реализации

- Rate limit можно начать in-memory per IP/login.
- CSRF не должен применяться к Basic Auth WebDAV.
- CSRF применяется к mutating cookie-auth API после login/register; WebDAV Basic Auth исключён.
- Auth rate limit считает только неуспешные попытки; успешная auth попытка сбрасывает счётчик, чтобы не ломать частые валидные WebDAV запросы Remotely Save.
- API body limit и WebDAV body limit настраиваются отдельно.
- Security headers включены глобально; HSTS включается только при TLS/`X-Forwarded-Proto: https`.

## Критерии приёмки

- Security tests проходят.
- Remotely Save smoke не сломан.

## План тестирования

- `go test ./...`
- `npm test`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- negative auth tests.

## Результаты валидации

- `go test ./...` — passed.
- `npm test` в `web/` — passed.
- `docker compose config` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — контейнер пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- Логи `mdock_test-mdock-1` просмотрены: 5xx, panic, `database is locked` и auth-secret leaks не обнаружены; 401/403/404 присутствуют только как ожидаемые negative checks.

## Откат

Откатить middleware/config changes.
