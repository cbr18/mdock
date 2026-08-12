# Web auth и управление vault

Task: [12_08_2026_20_05_web_auth_vault_management.md](../tasks/12_08_2026_20_05_web_auth_vault_management.md)

## Последовательность реализации

1. Добавить store методы `CreateUser`, `CreateVaultForUser`, `DeleteSession`.
2. Добавить API `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/vaults`.
3. При создании vault сразу создавать папку, `git init`, ветку `main`, recovery/no-op commit.
4. Обновить frontend:
   - auth mode login/register;
   - session bootstrap через `/api/auth/me`;
   - vault list;
   - create vault form;
   - WebDAV URL copy/display;
   - logout.
5. Обновить frontend tests.
6. Обновить smoke tests на register -> create vault -> WebDAV roundtrip.
7. Обновить README/docs.

## Проверки

- `go test ./...`
- `cd web && npm test`
- `cd web && npm run build`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down`

## Риски

- Slug collisions при регистрации и создании vault.
- Session cookie HttpOnly означает, что frontend должен полагаться на `/api/auth/me`.
- После создания vault нужно синхронно подготовить git repo, иначе WebDAV может получить неготовую директорию.

## Заметки по откату

Откатить изменения API/frontend/tests/docs. Реальные данные не удалять без отдельного запроса.
