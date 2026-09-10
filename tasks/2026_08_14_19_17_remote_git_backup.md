# Remote git backup

Status: DONE
Created: 2026-08-14 19:17
Project: mdock
Plan: [14_08_2026_19_17_remote_git_backup.md](../plans/14_08_2026_19_17_remote_git_backup.md)

## Проблема

Vaults сейчас имеют локальные git repos, но нет server-side remote backup/push. Пользователь хотел возможность потом бэкапировать через remote.

## Доказательства

- Git layer делает локальные commits.
- Remote backup/sync в ТЗ вынесен позже.

## Нефункциональные ограничения

- Не хранить secrets небезопасно.
- Не блокировать WebDAV writes remote push-ем.
- Remote errors должны быть видимы.

## Не входит в задачу

- Git merge conflict UI.
- Multi-remote sync.
- GitHub/Forgejo app integration.

## Желаемое поведение

- Vault может иметь remote URL.
- Push выполняется отдельно от локального commit path.
- Ошибки push видны.

## Затронутые области

- `store`
- `git`
- `app`
- `httpapi`
- docs/tests

## Заметки по реализации

- Начать с manual push/backup command/API.
- Credentials story спроектировать отдельно перед реализацией.
- MVP не хранит credentials: URL с embedded userinfo запрещён; для SSH используется окружение/ключи сервера.
- Push запускается вручную через API и не включается в обычный WebDAV write path.
- Добавлены endpoints:
  - `GET /api/vaults/{slug}/git/remote`;
  - `PUT /api/vaults/{slug}/git/remote`;
  - `POST /api/vaults/{slug}/git/push`.
- Push сериализуется через git queue exclusive section и перед push делает flush pending local commits.
- Последний результат push хранится в vault metadata: `last_push_at`, `last_push_error`.

## Критерии приёмки

- Локальные commits не зависят от remote availability.
- Remote push errors не теряются.

## План тестирования

- Unit tests с локальным bare remote.
- `go test ./...`
- `npm test`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- `go test ./...` — passed, включая unit/integration test с локальным bare repo.
- `npm test` в `web/` — passed.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — контейнер пересобран и запущен.
- `./test/run-smoke.sh` — passed.
- Логи `mdock_test-mdock-1` просмотрены: 5xx, panic, `database is locked`, auth-secret leaks не обнаружены.

## Откат

Откатить remote config/API. Локальные repos не удалять.
