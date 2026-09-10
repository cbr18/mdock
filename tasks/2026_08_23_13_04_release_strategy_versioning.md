# Release strategy and versioning

Status: DONE
Created: 2026-08-23 13:04
Project: mdock
Plan: [23_08_2026_13_04_release_strategy_versioning.md](../plans/23_08_2026_13_04_release_strategy_versioning.md)

## Проблема

В проекте уже есть production deploy, WebDAV, auth, git и web UI, но нет явной стратегии релизов, версии приложения, changelog и понятного правила, когда выпускать `1.0.0`.

## Доказательства

- Git tags отсутствуют.
- `CHANGELOG.md` и `VERSION` отсутствуют.
- `web/package.json` содержит `version: 0.0.0`, но backend binary и API версию не отдают.
- README существует только на английском, а большая часть проектных docs написана на русском.
- `.env.example` плоский и без комментариев по группам параметров.

## Нефункциональные ограничения

- Не выпускать tag и не push без отдельной команды пользователя.
- Не менять production deploy semantics в этой задаче.
- Не добавлять внешний release tooling без необходимости.
- Не ломать текущий CI/CD.
- Сохранять документацию в простом markdown-формате.

## Не входит в задачу

- Создание git tag.
- Публикация Docker image в registry.
- Автоматическая генерация release notes.
- Перевод всей документации на два языка.
- Изменение production pipeline deploy-поведения.

## Желаемое поведение

- Зафиксирована стратегия версий до `1.0.0`.
- Есть начальная версия проекта `0.1.0-alpha.1`.
- Есть `CHANGELOG.md` с правилами ведения.
- Есть `VERSION` как простой источник текущей версии.
- Backend умеет показать версию через CLI и JSON API.
- README явно указывает языковую политику документации и структуру env.
- `.env.example` и `test/.env.test.example` структурированы по секциям.

## Затронутые области

- `VERSION`
- `CHANGELOG.md`
- `cmd/mdock/main.go`
- `internal/config` или отдельный internal version package
- `internal/httpapi/router.go`
- `docs/release-strategy.md`
- `README.md`
- `.env.example`
- `test/.env.test.example`
- tests

## Заметки по реализации

- Базовая версия: `0.1.0-alpha.1`.
- `1.0.0` считаем преждевременным до стабильных WebDAV/editor/backup/upgrade contracts.
- CLI: `mdock version`.
- API: `GET /api/version`, публичный read-only endpoint без auth.
- Build-time override позже можно подключить через `-ldflags "-X ..."`; MVP может читать константу из package.

## Критерии приёмки

- Документирована release strategy.
- README отвечает на вопросы: есть ли русский/английский README, где основные docs, как устроен env.
- `.env.example` структурирован и не содержит secrets.
- CLI/API версия покрыты тестами.
- `go test ./...` проходит.
- `npm test` не ломается.
- `npm run build` проходит.

## План тестирования

- `go test ./...`
- `npm test`
- `npm run build`
- Ручно проверить `go run ./cmd/mdock version`.

## Результаты валидации

- `go test ./...` — passed.
- `go run ./cmd/mdock version` — printed `0.1.0-alpha.1`.
- `npm test` — passed, 30 tests.
- `npm run build` — passed.

## Commits

- Не создано: изменения подготовлены локально, push не выполнялся.

## Откат

- Удалить release/version docs и `VERSION`.
- Убрать CLI/API version endpoints.
- Вернуть README/env examples к предыдущему виду.
