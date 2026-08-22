# Forgejo CI/CD deploy pipeline

Status: DONE

Plan: [22_08_2026_13_53_forgejo_ci_cd_deploy.md](../plans/22_08_2026_13_53_forgejo_ci_cd_deploy.md)

## Проблема

Нужна deploy job для Forgejo Actions: при push в `main` приложение должно автоматически деплоиться на production server, а при push в любую другую ветку должен запускаться тестовый набор без деплоя. GitHub Actions для этого проекта использовать не нужно.

## Доказательства

- В репозитории уже есть `.forgejo/workflows/test.yml` и `.forgejo/workflows/prod-deploy.yml`, но тестовый workflow сейчас запускается и на `main`, и на остальных ветках.
- Prod deploy workflow сейчас сразу запускает SSH deploy и не содержит обязательный тестовый этап перед деплоем.
- `docs/deployment.md` всё ещё описывает одинаковые workflow для GitHub Actions и Forgejo Actions, хотя целевой CI/CD теперь Forgejo-only.

## Нефункциональные ограничения

- Не хранить production secrets, домены, токены и приватные ключи в репозитории.
- Не отключать проверку SSH host key через `StrictHostKeyChecking=no`.
- Test stack в CI запускать только из папки `test/` командой `docker compose up -d --build`.
- Production deploy должен использовать существующий `scripts/deploy-prod.sh`, чтобы SQL backup перед обновлением stack оставался единым механизмом.
- Pipeline должен быть компактнее примера `../CarsParser`, потому что в mdock один Go backend, один frontend и один Docker stack.

## Не входит в задачу

- Настройка реальных Forgejo secrets на сервере.
- Фактический запуск production deploy.
- Миграция на image registry и push Docker image.
- Изменение runtime-конфигурации production сервера.

## Желаемое поведение

- Push в ветку, отличную от `main`, запускает Forgejo test workflow.
- Push в `main` запускает Forgejo prod workflow: сначала тесты/build/smoke, затем SSH deploy.
- GitHub Actions workflow-файлы удалены, чтобы не было второго источника CI/CD.
- Документация описывает Forgejo-only схему, нужные secrets и состав проверок.

## Затронутые области

- `.forgejo/workflows/test.yml`
- `.forgejo/workflows/prod-deploy.yml`
- `.github/workflows/*`
- `docs/deployment.md`
- `tasks/`
- `plans/`

## Заметки по реализации

- Test job должен повторяться в prod workflow, чтобы deploy не зависел от отдельного workflow-run.
- Smoke test запускается после поднятия `test/docker-compose.yml` и всегда останавливает test stack через `docker compose down -v`.
- SSH deploy остаётся через `appleboy/ssh-action`, как в текущем workflow, но job зависит от successful CI.
- Для production checkout на сервере используется `git fetch`, `checkout main`, `pull --ff-only`, затем `./scripts/deploy-prod.sh`.

## Критерии приёмки

- `.forgejo/workflows/test.yml` не запускается на push в `main`.
- `.forgejo/workflows/prod-deploy.yml` запускается на push в `main` и содержит test job перед deploy.
- GitHub Actions workflow-файлы удалены.
- `docs/deployment.md` не говорит, что GitHub Actions является поддерживаемым CI/CD для проекта.
- Локальная валидация workflow-related файлов и релевантные тесты выполнены или явно указана причина, почему их нельзя выполнить.

## План тестирования

- `go test ./...`
- `npm test` в `web/`
- `npm run build` в `web/`
- `docker compose config`
- `docker compose config` из папки `test/`
- `git diff --check`

## Результаты валидации

- `go test ./...` — успешно.
- `npm test` в `web/` — успешно, 4 файла тестов, 26 тестов.
- `npm run build` в `web/` — успешно.
- `docker compose config` — успешно.
- `docker compose --env-file .env.test.example config` из папки `test/` — успешно.
- `docker compose up -d --build` из папки `test/` — успешно.
- `./test/run-smoke.sh` — успешно.
- `docker compose down -v` из папки `test/` — успешно, test stack остановлен и volumes удалены.
- `git diff --check` — успешно.

## Откат

- Вернуть предыдущие workflow-файлы `.forgejo/workflows/*`.
- При необходимости восстановить `.github/workflows/*` из предыдущего commit.
- Документацию `docs/deployment.md` вернуть к предыдущему описанию CI/CD.
