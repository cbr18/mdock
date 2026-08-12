# Web auth и управление vault

Status: DONE
Created: 2026-08-12 20:05
Project: mdock
Plan: [12_08_2026_20_05_web_auth_vault_management.md](../plans/12_08_2026_20_05_web_auth_vault_management.md)

## Проблема

Веб-морда сейчас умеет только отправить login form и показать текстовый статус. Пользователь не может зарегистрироваться, увидеть vaults, создать новый vault и получить WebDAV URL для Obsidian.

## Доказательства

- Нет `/api/auth/register`.
- Нет `POST /api/vaults`.
- Frontend не хранит состояние текущего пользователя и не отображает vault management.

## Нефункциональные ограничения

- Без отдельного auth proxy.
- Пароли хранятся только как bcrypt hashes.
- Session cookie остаётся HttpOnly.
- Web UI пока минимальный operational UI, без web editor.
- Не добавлять новый UI-фреймворк.
- Не делать shared vault management.

## Не входит в задачу

- Web editor.
- Markdown preview.
- Shared vault invite/member management.
- Password reset/email.
- App-passwords.
- Admin panel.

## Желаемое поведение

- Пользователь может зарегистрироваться через веб-форму.
- После регистрации создаётся personal vault.
- Пользователь может войти через веб-форму.
- После входа UI показывает текущего пользователя и список vaults.
- Пользователь может создать новый vault.
- Для каждого vault UI показывает WebDAV URL `/webdav/<vault-slug>/`.
- Есть logout.
- Ошибки API отображаются без падения UI.

## Затронутые области

- `internal/store/`
- `internal/server/`
- `cmd/mdock/`
- `web/src/`
- `test/smoke/`
- `README.md`
- `docs/`

## Заметки по реализации

- Регистрация создаёт user + personal vault в одной backend операции.
- Создание vault создаёт `kind=personal` или `kind=shared`? Для MVP использовать `personal` только для auto vault и `shared` для дополнительных vault, где создатель `owner`; совместный доступ будет позже.
- Slug должен быть stable и unique; при конфликте добавлять suffix.
- Web UI использует existing React/Vite/lucide-react.
- Logout можно реализовать удалением session в backend и очисткой cookie.

## Критерии приёмки

- `POST /api/auth/register` создаёт пользователя и session.
- `POST /api/auth/logout` завершает session.
- `GET /api/auth/me` показывает текущего пользователя.
- `GET /api/vaults` показывает vaults пользователя.
- `POST /api/vaults` создаёт новый vault и инициализирует git repo.
- Frontend покрывает register/login/vault list/create URL flow.
- Smoke test проверяет регистрацию, создание vault и WebDAV roundtrip для нового vault.

## План тестирования

- `go test ./...`
- `cd web && npm test`
- `cd web && npm run build`
- Docker test stack + `./test/run-smoke.sh`

## Результаты валидации

- `env GOCACHE=/tmp/go-cache go test ./...` — успешно.
- `cd web && npm test` — успешно.
- `cd web && npm run build` — успешно.
- `env GOCACHE=/tmp/go-cache go build -mod=vendor -buildvcs=false -o /tmp/mdock ./cmd/mdock` — успешно.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- UI реализует:
  - login/register modes;
  - session bootstrap через `/api/auth/me`;
  - logout;
  - список vaults;
  - создание vault;
  - отображение WebDAV URL `/webdav/<vault-slug>/`.
- Backend API реализует:
  - `POST /api/auth/register`;
  - `POST /api/auth/logout`;
  - `POST /api/vaults`.
- Test stack оставлен запущенным для ручной проверки.

## Откат

Откатить backend API и frontend изменения. Пользовательские DB/vault data и Docker volumes не удалять без отдельного запроса.
