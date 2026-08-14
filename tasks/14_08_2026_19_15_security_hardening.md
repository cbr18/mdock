# Server security hardening

Status: CREATED
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

## Критерии приёмки

- Security tests проходят.
- Remotely Save smoke не сломан.

## План тестирования

- `go test ./...`
- `./test/run-smoke.sh`
- negative auth tests.

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить middleware/config changes.
