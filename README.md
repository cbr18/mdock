# mdock

Self-hosted markdown vault server: Go backend, React/Vite web UI, SQLite runtime state, local git history and WebDAV access for Obsidian.

## Documentation Language

The root README is the bilingual entry point for setup and operations. Detailed project documents in `docs/`, `tasks/` and `plans/` are currently written in Russian because the product requirements and implementation notes are maintained in Russian.

## Русская Версия

mdock — self-hosted сервер markdown-хранилищ для Obsidian: Go backend, React/Vite web UI, SQLite для runtime-state, локальная git-история и WebDAV-доступ.

Основной сценарий:

- пользователь регистрируется или входит через web UI;
- создаёт хранилище;
- подключает Obsidian через WebDAV URL вида `http://<host>/webdav/<vault-slug>/`;
- использует тот же логин и пароль, что и в web UI;
- файлы хранилища сохраняются на сервере и коммитятся в локальный git repo.

Для production-доступа через интернет нужен HTTPS перед mdock, например nginx/Caddy/Traefik. Auth остаётся внутри mdock.

### Разработка

Установить зависимости:

```bash
go mod download
cd web && npm install
```

Запустить backend:

```bash
BOOTSTRAP_USERNAME=admin BOOTSTRAP_PASSWORD=dev-password \
VAULTS_ROOT=/tmp/mdock-vaults DATA_DIR=/tmp/mdock-data \
go run ./cmd/mdock
```

Запустить frontend с hot reload:

```bash
cd web
npm run dev
```

Vite dev server проксирует `/api`, `/healthz` и `/webdav` в Go backend.

### Production Docker

Скопировать `.env.example` в `.env`, задать `FIRST_ADMIN_TOKEN`, если сервис доступен не только из доверенной локальной сети, и запустить:

```bash
docker compose up -d --build
```

Корневой `docker-compose.yml` — production stack. Test/dev stack запускается только из папки `test`:

```bash
cd test && docker compose up -d --build
```

### Obsidian Remotely Save

Рекомендуемые настройки:

```text
Remote Service: WebDAV
Server Address: http://<host>/webdav/<vault-slug>/
Username: логин mdock
Password: пароль mdock
Auth Type: basic
Depth Header Sent To Servers: only supports depth='1'
Remote Base Dir: оставить пустым или задать имя папки
```

В MVP не включайте `supports depth='infinity'`: mdock намеренно отклоняет `Depth: infinity`.

Если `Remote Base Dir` пустой, Remotely Save использует имя локального Obsidian vault, например `Obsidian Vault`. Web UI mdock по умолчанию открывает папку из `DEFAULT_FILE_ROOT`; дефолт — `Obsidian Vault`, отключение — `DEFAULT_FILE_ROOT=.`.

### Версии И Релизы

Текущая версия хранится в [VERSION](VERSION) и доступна через:

```bash
mdock version
```

```text
GET /api/version
```

Проект пока pre-1.0. `1.0.0` откладывается до стабильных контрактов WebDAV, редактора, backup/restore и upgrade. Стратегия описана в [docs/release-strategy.md](docs/release-strategy.md), изменения — в [CHANGELOG.md](CHANGELOG.md).

### Документация

- API: [docs/server-api.md](docs/server-api.md)
- Деплой, SQL backups и CI/CD: [docs/deployment.md](docs/deployment.md)
- Git-модель хранилищ: [docs/git-vaults.md](docs/git-vaults.md)
- Совместимость Remotely Save: [docs/remotely-save-webdav-compatibility.md](docs/remotely-save-webdav-compatibility.md)
- Технический стек: [docs/tech-stack.md](docs/tech-stack.md)

### Проверки

```bash
go test ./...
go build -mod=vendor -buildvcs=false ./cmd/mdock
cd web && npm test
cd web && npm run build
docker compose config
cd test && docker compose config
```

## Development

Install dependencies:

```bash
go mod download
cd web && npm install
```

Run backend:

```bash
BOOTSTRAP_USERNAME=admin BOOTSTRAP_PASSWORD=dev-password \
VAULTS_ROOT=/tmp/mdock-vaults DATA_DIR=/tmp/mdock-data \
go run ./cmd/mdock
```

For production, prefer leaving `BOOTSTRAP_USERNAME` and `BOOTSTRAP_PASSWORD` empty and creating the first admin through setup registration. See [docs/deployment.md](docs/deployment.md).

Run frontend with hot reload:

```bash
cd web
npm run dev
```

The Vite dev server proxies `/api`, `/healthz` and `/webdav` to the Go backend.

Operational checks:

```text
GET /healthz
GET /readyz
```

## Web UI And WebDAV

Open the web UI, register or log in, then create a vault from the vault dashboard.

Each vault card shows its WebDAV URL:

```text
http://<host>/webdav/<vault-slug>/
```

Use the same login and password in Obsidian WebDAV settings. In production, put mdock behind HTTPS before exposing it outside a trusted network.

## Obsidian Remotely Save

mdock targets the Obsidian Remotely Save plugin as the primary WebDAV client for the MVP.

Recommended Remotely Save settings:

```text
Remote Service: WebDAV
Server Address: http://<host>/webdav/<vault-slug>/
Username: your mdock login
Password: your mdock password
Auth Type: basic
Depth Header Sent To Servers: only supports depth='1'
Remote Base Dir: leave empty to use the Obsidian vault name, or set a custom folder name
```

Do not select `supports depth='infinity'` in the MVP. mdock intentionally rejects `Depth: infinity`; Remotely Save should use its default recursive `Depth: 1` mode.

Remotely Save stores files inside `/<remoteBaseDir>/` on the WebDAV server. If `Remote Base Dir` is empty, the plugin uses the local Obsidian vault name, for example:

```text
/webdav/<vault-slug>/Obsidian Vault/Без названия.md
```

The server supports the Remotely Save flows covered by the smoke test: connectivity check, overwrite, `.obsidian/plugins/remotely-save/*`, custom remote base dir, Unicode paths, CORS origins used by Obsidian mobile, and parallel writes. Detailed notes live in [docs/remotely-save-webdav-compatibility.md](docs/remotely-save-webdav-compatibility.md).

Troubleshooting:

- If mobile Obsidian cannot connect, make sure the request reaches mdock directly or through a reverse proxy that preserves WebDAV methods and CORS headers.
- If sync fails after changing `Remote Base Dir`, treat it as a new remote folder; Remotely Save does not move old remote content automatically.
- If large-file sync fails, keep normal full-file upload behavior for now. mdock does not advertise Nextcloud, Apache partial update or Sabre partial update capabilities in the MVP.

## Remote Git Backup

Each vault keeps local git history by default. A vault owner can optionally configure a backup remote through the API:

```text
PUT /api/vaults/<vault-slug>/git/remote
POST /api/vaults/<vault-slug>/git/push
GET /api/vaults/<vault-slug>/git/remote
```

mdock does not store git credentials in MVP. URLs with embedded userinfo such as `https://user:token@host/repo.git` are rejected. Use server-side SSH keys, a local bare repo path, or a credential helper configured outside mdock.

Remote push is manual in the current server API. Future auto-push must run only when a remote is configured and must not turn a missing remote into an error. The full vault git model is documented in [docs/git-vaults.md](docs/git-vaults.md).

## API And Deployment Docs

- Server API contract: [docs/server-api.md](docs/server-api.md)
- Deployment, SQL backups and CI/CD: [docs/deployment.md](docs/deployment.md)
- Git model for vaults: [docs/git-vaults.md](docs/git-vaults.md)
- Release strategy: [docs/release-strategy.md](docs/release-strategy.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Versioning

The current version is stored in [VERSION](VERSION) and exposed by:

```bash
mdock version
```

```text
GET /api/version
```

mdock is still pre-1.0. `1.0.0` is intentionally deferred until WebDAV compatibility, editor behavior, backup/restore and upgrade contracts are stable.

## Production Docker

Copy `.env.example` to `.env`, configure `FIRST_ADMIN_TOKEN` for first-admin setup if the service is reachable outside a trusted local network, then run:

```bash
docker compose up -d --build
```

The root `docker-compose.yml` is the production stack. It mounts separate volumes for `/vaults`, `/data` and `/backups`.
`DEFAULT_FILE_ROOT` controls which folder the web UI opens by default inside a vault. The default is `Obsidian Vault`; set `DEFAULT_FILE_ROOT=.` to open the real vault root.

`.env.example` is grouped by purpose:

- HTTP: bind address.
- Storage: vaults, SQLite data and SQL backups.
- Git and files: git binary, default file root, git debounce and file lock TTL.
- Auth/session: cookie/session behavior and first-admin/bootstrap settings.
- Request limits/rate limits: API/WebDAV body limits and auth throttling.

Security-related limits can be configured through env:

```text
API_BODY_LIMIT_BYTES=1048576
WEBDAV_BODY_LIMIT_BYTES=52428800
AUTH_RATE_LIMIT_ATTEMPTS=20
AUTH_RATE_LIMIT_WINDOW=1m
```

Create a SQL backup of app runtime state:

```bash
./scripts/backup-sql.sh
```

## Test Stack

The dev/test stack lives in `./test/docker-compose.yml` and uses separate test volumes.

Render config:

```bash
cd test && docker compose config
```

Run the stack manually:

```bash
cd test && docker compose up -d --build
```

Run smoke tests against the already running test stack:

```bash
./test/run-smoke.sh
```

Stop the stack:

```bash
cd test && docker compose down
```

## Local Checks

```bash
go test ./...
go build -mod=vendor -buildvcs=false ./cmd/mdock
cd web && npm test
cd web && npm run build
docker compose config
cd test && docker compose config
```

Docker build uses vendored Go dependencies, so backend image builds do not need to download Go modules during the Docker build stage.
