# Git visibility API

Status: CREATED
Created: 2026-08-14 19:12
Project: mdock
Plan: [14_08_2026_19_12_git_visibility_api.md](../plans/14_08_2026_19_12_git_visibility_api.md)

## Проблема

Git работает как внутренняя очередь, но пользователь и web UI не видят статус repo, последние commits и ошибки queue.

## Доказательства

- Git commits создаются после WebDAV writes.
- Queue имеет `LastError`, но API его не отдаёт.

## Нефункциональные ограничения

- Не выполнять произвольные git commands из API.
- Не раскрывать пути чужих vaults.

## Не входит в задачу

- Remote backup/push.
- UI history browser.

## Желаемое поведение

- API отдаёт git status по vault.
- API отдаёт последние commits.
- API отдаёт last queue error.

## Затронутые области

- `internal/git/`
- `internal/app/`
- `internal/httpapi/`
- tests

## Заметки по реализации

- Endpoints только для vault member.
- Ограничить количество commits.

## Критерии приёмки

- Member видит git status своего vault.
- Чужой vault недоступен.
- Tests проходят.

## План тестирования

- `go test ./...`
- `./test/run-smoke.sh`

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить API/handler changes.
