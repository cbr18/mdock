# Vault management API

Task: [14_08_2026_19_14_vault_management_api.md](../tasks/14_08_2026_19_14_vault_management_api.md)

## Последовательность реализации

1. Уточнить model после vault cleanup.
2. Добавить update/list detail endpoints.
3. Добавить archive/delete behavior.
4. Добавить tests.

## Проверки

- `go test ./...`
- `./test/run-smoke.sh`

## Риски

- Slug changes ломают clients.

## Заметки по откату

Откатить endpoints/schema.
