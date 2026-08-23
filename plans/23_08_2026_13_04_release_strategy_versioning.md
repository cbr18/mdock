# Release strategy and versioning

Task: [23_08_2026_13_04_release_strategy_versioning.md](../tasks/23_08_2026_13_04_release_strategy_versioning.md)

## Последовательность реализации

1. Зафиксировать текущую версию `0.1.0-alpha.1` в `VERSION`.
2. Добавить маленький internal package для версии приложения.
3. Добавить CLI-команду `mdock version`.
4. Добавить публичный `GET /api/version`.
5. Добавить/обновить тесты backend version behavior.
6. Создать `CHANGELOG.md`.
7. Создать `docs/release-strategy.md`.
8. Обновить README: документация, язык, release/versioning, env structure.
9. Структурировать `.env.example` и `test/.env.test.example` комментариями.
10. Прогнать проверки.

## Проверки

- `go test ./...`
- `npm test`
- `npm run build`
- `go run ./cmd/mdock version`

## Риски

- Если версия будет храниться только в файле, Go binary не получит её автоматически без генерации или embed.
- Если добавить build-time ldflags сразу, можно усложнить CI/CD до того, как нужен registry/tag release.
- Двуязычный README может быстро начать расходиться; для MVP лучше один README на английском и русские проектные docs.

## Заметки по откату

- Все изменения локальны и не требуют миграций данных.
- Откат делается обычным revert этих файлов.
