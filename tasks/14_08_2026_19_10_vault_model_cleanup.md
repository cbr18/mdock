# Vault model cleanup

Status: CREATED
Created: 2026-08-14 19:10
Project: mdock
Plan: [14_08_2026_19_10_vault_model_cleanup.md](../plans/14_08_2026_19_10_vault_model_cleanup.md)

## Проблема

Personal vault сейчас создаётся со `slug/path`, завязанными на `user.login`. Если позже пользователь сменит login или появятся shared vaults, физический путь vault не должен переезжать и ломать git repo/WebDAV/backup references.

## Доказательства

- `CreateUser` создаёт personal vault через login.
- `vaults.path` сейчас может совпадать с username.
- В ТЗ уже зафиксировано, что user и vault — разные сущности, доступ через membership.

## Нефункциональные ограничения

- Не ломать существующие vaults.
- Не переименовывать физические папки без отдельной миграции и backup plan.
- Стабильный `vault.path` должен быть техническим идентификатором.
- `vault.name` должен быть display value.

## Не входит в задачу

- Rename user API.
- Rename vault slug API.
- Shared vault UI.
- Миграция старых volume paths.

## Желаемое поведение

- Новые vaults имеют display `name`.
- Новые vaults получают стабильный `path`, не завязанный на username.
- `slug` остаётся URL identifier и может отличаться от `path`.
- Existing vaults продолжают работать.

## Затронутые области

- `internal/store/`
- `internal/app/`
- `internal/vault/`
- API responses
- tests/smoke
- docs

## Заметки по реализации

- Добавить `vaults.name`.
- Для новых vault path использовать `vault-<id>` или стабильный random id после insert.
- Для existing rows backfill `name = slug`.
- Не делать destructive migration.

## Критерии приёмки

- Новый user получает personal vault с path, не зависящим от login.
- Существующие vaults доступны.
- API возвращает `name`, `slug`, `path`, `kind`, `role`.
- Тесты проходят.

## План тестирования

- `go test ./...`
- `./test/run-smoke.sh`
- Проверить, что новые vault directories имеют стабильный technical path.

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить schema/code changes. Не удалять существующие vault directories.
