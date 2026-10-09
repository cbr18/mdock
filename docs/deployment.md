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
DEFAULT_FILE_ROOT=Obsidian Vault
COMMIT_DEBOUNCE=5s
LOCK_TTL=30s
SESSION_TTL=24h
COOKIE_SECURE=true
FIRST_ADMIN_TOKEN=<one-time setup token>
```

`BOOTSTRAP_USERNAME` и `BOOTSTRAP_PASSWORD` оставлены для dev/test и аварийного bootstrap. В production предпочтительнее не задавать их, открыть приложение и создать первого admin через setup-регистрацию. Если задан `FIRST_ADMIN_TOKEN`, его нужно передать при setup-регистрации.

`DEFAULT_FILE_ROOT` задаёт папку, которую web UI открывает внутри хранилища по умолчанию. WebDAV root при этом остаётся `/webdav/<vault-slug>/`. Значение по умолчанию — `Obsidian Vault`, что совпадает с default `remoteBaseDir || vaultName` у Remotely Save для vault с таким именем. Чтобы web UI открывал настоящий корень хранилища, задайте `DEFAULT_FILE_ROOT=.`.

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

## SQL Restore

Восстановление SQLite из backup:

```bash
./scripts/restore-sql.sh --data-dir /data --backup-file /backups/mdock-20260814T120000Z.sql
```

Скрипт:
1. Проверяет целостность backup файла (PRAGMA integrity_check)
2. Создаёт pre-restore backup текущей БД (`app.db.pre-restore-<timestamp>`)
3. Восстанавливает из backup
4. Верифицирует восстановленную БД

После restore нужно перезапустить mdock:
```bash
docker compose restart mdock
```

## Backup Verification

Проверка целостности backup и текущего состояния:

```bash
./scripts/verify-backup.sh --data-dir /data --vaults-root /vaults [--backup-file /backups/mdock-*.sql]
```

Проверяет:
- SQLite integrity_check
- Наличие и заполненность core таблиц (users, vaults, vault_members, sessions, file_locks)
- Git fsck для каждого vault repo
- Читаемость sample файлов
- Опционально: восстановление backup во временную БД и проверка структуры

## Update Script

Автоматизированное обновление с pre-flight проверками:

```bash
# Проверить доступные обновления
./scripts/update.sh --check

# Обновить до последнего тега
./scripts/update.sh --apply --yes

# Обновить до конкретного тега
./scripts/update.sh --apply --target v0.1.0-alpha.1 --yes

# Обновить из ветки main
./scripts/update.sh --apply --branch main --yes
```

Pre-flight проверки при `--apply`:
1. Чистое git working tree
2. SQL backup создаётся и верифицируется через `verify-backup.sh`
3. Проверка дискового пространства
4. Только потом запускает `deploy-prod.sh`

## Verified Upgrade Test

CI job `.forgejo/workflows/upgrade-test.yml` проверяет upgrade path:
1. Деплоит предыдущий релизный тег
2. Сидит тестовые данные (user, vault, files, git history)
3. Обновляет до текущей версии через `update.sh`
4. Верифицирует: все файлы доступны, git history сохранён, WebDAV работает, версия обновилась

## Rollback Procedure

При проблемах после обновления:

```bash
# 1. Остановить mdock
docker compose stop mdock

# 2. Восстановить SQLite из pre-restore backup (создаётся автоматически при restore)
cp /data/app.db.pre-restore-<timestamp> /data/app.db

# 3. Вернуть код к предыдущей версии
git checkout <previous-tag-or-commit>

# 4. Пересобрать и запустить
docker compose up -d --build

# 5. Верифицировать
curl http://localhost:8080/healthz
curl http://localhost:8080/api/version
```

## Pipelines

CI/CD проекта работает через Forgejo Actions. GitHub Actions workflow-файлы в репозитории не поддерживаются, чтобы не было второго источника деплоя.

- `.forgejo/workflows/test.yml`
- `.forgejo/workflows/prod-deploy.yml`

Branch policy:

- push в любую ветку, кроме `main`, запускает только `.forgejo/workflows/test.yml`;
- push в `main` запускает `.forgejo/workflows/prod-deploy.yml`;
- prod workflow сначала выполняет тот же тестовый набор, и только после успешных проверок запускает SSH deploy;
- `workflow_dispatch` оставлен для ручного запуска.
- `permissions` в Forgejo Actions не используется, права выдаются через Forgejo Authorized Integrations.

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
- создаёт `PROD_APP_DIR`, если папки нет;
- добавляет `kotyonki.su:2288` в `~/.ssh/known_hosts` production user перед `git fetch`;
- если в `PROD_APP_DIR` ещё нет `.git`, инициализирует checkout из `PROD_REPO_SSH_URL`;
- если в `PROD_APP_DIR` есть невалидная `.git`, deploy останавливается с явной ошибкой, чтобы не удалять данные автоматически;
- делает `git fetch origin main`, `checkout -B main origin/main`, `pull --ff-only`;
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

Production checkout инициализируется из `ssh://git@kotyonki.su:2288/cbr/mdock.git`; это не secret.

## HTTPS

Домен не обязателен для LAN/WebDAV-тестов. Для доступа через интернет нужен HTTPS через reverse proxy, например nginx/Caddy/Traefik. Auth остаётся внутри mdock, reverse proxy делает только TLS termination и проксирование WebDAV methods.
