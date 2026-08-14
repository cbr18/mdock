# Server observability

Task: [14_08_2026_19_16_observability.md](../tasks/14_08_2026_19_16_observability.md)

## Последовательность реализации

1. Добавить `/readyz`.
2. Добавить request logging middleware.
3. Добавить git queue status exposure.
4. Добавить tests.

## Проверки

- `go test ./...`
- `./test/run-smoke.sh`

## Риски

- Логи не должны раскрывать секреты.

## Заметки по откату

Откатить endpoints/logging middleware.
