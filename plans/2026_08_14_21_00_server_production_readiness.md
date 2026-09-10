# Server Production Readiness Plan

Task: [14_08_2026_21_00_server_production_readiness.md](../tasks/14_08_2026_21_00_server_production_readiness.md)

## Последовательность реализации

1. Вынести SQLite schema bootstrap в версионированные миграции без новой зависимости.
2. Добавить SQL DDL+DML backup-команду для deploy flow.
3. Переделать регистрацию первого admin: setup-регистрация для пустой БД, optional `FIRST_ADMIN_TOKEN`, закрытие публичной регистрации после первого пользователя.
4. Добавить admin create user endpoint и guard от отключения последнего активного admin.
5. Добавить startup maintenance: подготовка всех vault'ов и очистка истёкших runtime locks/sessions.
6. Добавить CI/CD workflow-файлы для Forgejo и GitHub Actions, deploy script и backup script.
7. Добавить `docs/server-api.md` и обновить README/env/compose.
8. Добавить/обновить тесты.

## Проверки

- `go test ./...`
- `npm test`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Риски

- Закрытие публичной регистрации меняет поведение API и smoke-тестов.
- Backup command должен уметь читать БД без применения миграций.
- Deploy workflow не должен содержать реальные production-секреты.

## Заметки по откату

- Кодовый откат через revert commit.
- Для БД использовать SQL dump из backup-папки, если откат нужен после миграций.
