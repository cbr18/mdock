# Deployment

## Config

Production stack описан в корневом `docker-compose.yml`.

Основные env:

```text
HTTP_PORT=8080
VAULTS_ROOT=/vaults
DATA_DIR=/data
BACKUP_DIR=/backups
GIT_BIN=git
COMMIT_DEBOUNCE=5s
LOCK_TTL=30s
SESSION_TTL=24h
COOKIE_SECURE=true
FIRST_ADMIN_TOKEN=<one-time setup token>
```

`BOOTSTRAP_USERNAME` и `BOOTSTRAP_PASSWORD` оставлены для dev/test и аварийного bootstrap. В production предпочтительнее не задавать их, открыть приложение и создать первого admin через setup-регистрацию. Если задан `FIRST_ADMIN_TOKEN`, его нужно передать при setup-регистрации.

## First Admin

Схема:

1. Запустить пустой stack с production `.env`.
2. Открыть web UI или вызвать `POST /api/auth/register`.
3. Создать первого пользователя.
4. Первый пользователь получает `is_admin=true`.
5. После этого публичная регистрация закрывается, новых пользователей создаёт admin через `POST /api/admin/users`.

Если `FIRST_ADMIN_TOKEN` пустой, первый admin создаётся без setup token. Для сервера, доступного не только из localhost/LAN, token должен быть задан.

## SQL Backups

SQLite backup не связан с git. Git remote хранит markdown vault contents, но не хранит пользователей, sessions, lock/runtime state и vault metadata.

Команда:

```bash
mdock backup-sql --data-dir /data --out /backups
```

В Docker:

```bash
./scripts/backup-sql.sh
```

Backup создаёт SQL-файл с DDL и DML вида:

```text
/backups/mdock-20260814T120000Z.sql
```

Deploy script запускает SQL backup перед обновлением compose stack.

## Pipelines

В репозитории есть одинаковые workflow-файлы для GitHub Actions и Forgejo Actions:

- `.github/workflows/test.yml`
- `.github/workflows/prod-deploy.yml`
- `.forgejo/workflows/test.yml`
- `.forgejo/workflows/prod-deploy.yml`

Test pipeline:

- `go test ./...`
- `go build -mod=vendor -buildvcs=false ./cmd/mdock`
- `npm ci`
- `npm test -- --runInBand`
- `npm run build`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`

Prod deploy pipeline:

- подключается к серверу по SSH;
- делает `git fetch`, `checkout main`, `pull --ff-only`;
- запускает `./scripts/deploy-prod.sh`;
- deploy script делает build/pull, SQL backup, `docker compose up -d --remove-orphans`.

Нужные secrets:

```text
PROD_SSH_HOST
PROD_SSH_PORT
PROD_SSH_USER
PROD_SSH_KEY
PROD_APP_DIR
```

Секреты и реальные production URLs в репозиторий не кладём.

## HTTPS

Домен не обязателен для LAN/WebDAV-тестов. Для доступа через интернет нужен HTTPS через reverse proxy, например nginx/Caddy/Traefik. Auth остаётся внутри mdock, reverse proxy делает только TLS termination и проксирование WebDAV methods.
