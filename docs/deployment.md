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

CI/CD проекта работает через Forgejo Actions. GitHub Actions workflow-файлы в репозитории не поддерживаются, чтобы не было второго источника деплоя.

- `.forgejo/workflows/test.yml`
- `.forgejo/workflows/prod-deploy.yml`

Branch policy:

- push в любую ветку, кроме `main`, запускает только `.forgejo/workflows/test.yml`;
- push в `main` запускает `.forgejo/workflows/prod-deploy.yml`;
- prod workflow сначала выполняет тот же тестовый набор, и только после успешных проверок запускает SSH deploy;
- `workflow_dispatch` оставлен для ручного запуска.

Test pipeline и pre-deploy CI:

- `go test ./...`
- `go build -mod=vendor -buildvcs=false ./cmd/mdock`
- `npm ci`
- `npm test`
- `npm run build`

Docker/Compose smoke проверки не входят в Forgejo test job, потому что текущий runner не имеет Docker CLI. До появления Docker-capable runner эти проверки запускаются локально или вручную:

- `docker compose config`
- `docker compose --env-file .env.test.example config` из папки `test/`
- `docker compose up -d --build` из папки `test/`
- `./test/run-smoke.sh`
- `docker compose down -v` из папки `test/`

Prod deploy pipeline:

- подключается к серверу по SSH;
- не использует внешние marketplace actions для SSH, чтобы Forgejo runner не зависел от зеркал `data.forgejo.org`;
- проверяет `PROD_SSH_FINGERPRINT` перед подключением;
- делает `git fetch`, `checkout main`, `pull --ff-only`;
- запускает `./scripts/deploy-prod.sh`;
- deploy script делает build/pull, SQL backup, `docker compose up -d --remove-orphans`;
- SQL backup создаётся перед обновлением production stack.

Нужные secrets:

```text
PROD_SSH_HOST
PROD_SSH_PORT
PROD_SSH_USER
PROD_SSH_KEY
PROD_SSH_FINGERPRINT
PROD_APP_DIR
```

Секреты и реальные production URLs в репозиторий не кладём.

## HTTPS

Домен не обязателен для LAN/WebDAV-тестов. Для доступа через интернет нужен HTTPS через reverse proxy, например nginx/Caddy/Traefik. Auth остаётся внутри mdock, reverse proxy делает только TLS termination и проксирование WebDAV methods.
