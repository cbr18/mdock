# Vault management API

Status: DONE
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
- Slug в этой задаче не меняется: WebDAV URL должен быть стабильным для настроенных клиентов.
- Archive обратимый: файлы и git repo остаются на диске, vault скрывается из обычного списка и недоступен через WebDAV до unarchive.
- Добавлены endpoints:
  - `GET /api/vaults/{slug}`;
  - `PATCH /api/vaults/{slug}`;
  - `POST /api/vaults/{slug}/archive`;
  - `POST /api/vaults/{slug}/unarchive`;
  - `GET /api/vaults/{slug}/webdav`;
  - `GET /api/vaults/{slug}/members`.
- Membership management пока read-only groundwork: owner видит текущих участников и роли.

## Критерии приёмки

- Vault owner может управлять своим vault.
- Non-member не имеет доступа.
- Tests проходят.

## План тестирования

- `go test ./...`
- `npm test`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- `go test ./...` — passed.
- `npm test` в `web/` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — контейнер пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- Логи `mdock_test-mdock-1` просмотрены: 5xx, panic, `database is locked` и auth-secret leaks не обнаружены; 401/403/404 присутствуют только как ожидаемые negative checks.

## Откат

Откатить API/schema changes.
