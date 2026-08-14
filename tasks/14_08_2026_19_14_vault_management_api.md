# Vault management API

Status: CREATED
Created: 2026-08-14 19:14
Project: mdock
Plan: [14_08_2026_19_14_vault_management_api.md](../plans/14_08_2026_19_14_vault_management_api.md)

## Проблема

Vault API умеет только list/create. Нет rename display name, slug management, archive/delete, WebDAV URL details и member groundwork.

## Доказательства

- API содержит `GET /api/vaults` и `POST /api/vaults`.
- Shared vault membership схема есть, но management отсутствует.

## Нефункциональные ограничения

- Delete/archive должны быть безопасными и обратимыми в MVP.
- Slug change может ломать WebDAV clients, нужен явный contract.

## Не входит в задачу

- Shared UI.
- Real-time collaboration.

## Желаемое поведение

- Vault можно переименовать по display name.
- Можно получить WebDAV URL/details.
- Можно archive/delete с безопасным поведением.
- Основа для membership management подготовлена.

## Затронутые области

- `store`
- `app`
- `httpapi`
- tests/docs

## Заметки по реализации

- Делать после vault model cleanup.
- Delete лучше начать с archive/disabled flag.

## Критерии приёмки

- Vault owner может управлять своим vault.
- Non-member не имеет доступа.
- Tests проходят.

## План тестирования

- `go test ./...`
- `./test/run-smoke.sh`

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить API/schema changes.
