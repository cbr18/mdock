# Release Strategy

## Текущий Статус

`1.0.0` для mdock пока рано. Проект уже можно деплоить и проверять в production-like окружении, но контракты WebDAV, web editor, backup/restore и upgrade ещё активно меняются.

Текущая базовая версия:

```text
0.1.0-alpha.1
```

Источник текущей версии:

- `VERSION` — человекочитаемый файл в корне репозитория;
- `internal/version.Current` — версия, которая попадает в Go binary;
- `mdock version` — CLI output;
- `GET /api/version` — JSON endpoint.

`VERSION` и `internal/version.Current` должны совпадать; это проверяется тестом.

## SemVer До 1.0

Используем SemVer-формат:

```text
vMAJOR.MINOR.PATCH
vMAJOR.MINOR.PATCH-alpha.N
vMAJOR.MINOR.PATCH-beta.N
```

До `1.0.0` правила такие:

- `0.x.0` — новая функциональность, изменение API/env/storage contract, заметное изменение UX;
- `0.x.y` — исправления багов без изменения контрактов;
- `alpha` — можно деплоить себе, но контракт может меняться;
- `beta` — feature set релиза почти закрыт, чинятся баги и совместимость;
- stable `0.x.0` — релизная точка без известных критичных проблем.

## Release Train

Ориентировочная линия:

- `v0.1.0-alpha.1` — текущий MVP baseline: auth, vaults, WebDAV, local git, web UI, CI/CD.
- `v0.2.0` — стабильная совместимость с Obsidian Remotely Save и WebDAV edge cases.
- `v0.3.0` — web editor/viewer становится предсказуемым рабочим интерфейсом.
- `v0.4.0` — эксплуатация: backup/restore, upgrade notes, observability, deploy hardening.
- `v0.5.0+` — расширение multi-user/shared vaults, permissions, app-passwords, remote git automation.

## Когда Можно 1.0.0

`1.0.0` можно выпускать только когда:

- WebDAV стабильно работает с Obsidian Remotely Save в documented settings;
- web UI покрывает базовые операции с хранилищем без временных заглушек в основных flow;
- есть понятный backup/restore process для SQLite и vault files;
- есть documented upgrade path между версиями;
- миграции БД обратимы или явно описаны;
- env/API contracts перестали часто ломаться;
- release checklist стабильно проходит.

## Branches And Tags

- `dev` — разработка и тесты.
- `main` — production deploy branch.
- tags `v*` — фиксированные release points.

Production deploy из `main` и release tag — разные события. Можно деплоить `main` без выпуска релиза, но release должен быть оформлен tag и changelog entry.

## Release Checklist

Перед tag:

1. Обновить `VERSION`.
2. Обновить `internal/version.Current`.
3. Обновить `CHANGELOG.md`.
4. Проверить env changes в `.env.example` и `docs/deployment.md`.
5. Проверить API changes в `docs/server-api.md`.
6. Выполнить `go test ./...`.
7. Выполнить `npm test`.
8. Выполнить `npm run build`.
9. Для release candidate выполнить smoke against test stack.
10. Создать tag `vX.Y.Z`.

## CI/CD Policy

Текущие Forgejo workflows:

- push в ветки кроме `main` запускает test workflow;
- push в `main` запускает test + production deploy;
- release tags пока не публикуют artifacts автоматически.

Позже можно добавить отдельный workflow на `push tags: v*`:

- собрать frontend;
- собрать Go binary с version metadata;
- собрать Docker image с immutable tag;
- приложить checksums и release notes.
