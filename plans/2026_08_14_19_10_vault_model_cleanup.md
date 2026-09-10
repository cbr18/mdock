# Vault model cleanup

Task: [14_08_2026_19_10_vault_model_cleanup.md](../tasks/14_08_2026_19_10_vault_model_cleanup.md)

## Последовательность реализации

1. Добавить `name` в `vaults`.
2. Backfill existing rows.
3. Разделить `name`, `slug`, `path` в create logic.
4. Для новых vaults сделать stable technical path.
5. Обновить API response/tests.
6. Обновить docs.

## Проверки

- `go test ./...`
- `./test/run-smoke.sh`

## Риски

- Ошибка миграции может затронуть существующие vaults.
- WebDAV URL должен продолжить использовать `slug`, не `path`.

## Заметки по откату

Откатить код и оставить данные без удаления. Если колонка уже добавлена, она может остаться неиспользуемой.
