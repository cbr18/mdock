# mdock

Self-hosted markdown vault server: Go backend, React/Vite web UI, SQLite runtime state, local git history and WebDAV access for Obsidian.

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

Run frontend with hot reload:

```bash
cd web
npm run dev
```

The Vite dev server proxies `/api`, `/healthz` and `/webdav` to the Go backend.

## Web UI And WebDAV

Open the web UI, register or log in, then create a vault from the vault dashboard.

Each vault card shows its WebDAV URL:

```text
http://<host>/webdav/<vault-slug>/
```

Use the same login and password in Obsidian WebDAV settings. In production, put mdock behind HTTPS before exposing it outside a trusted network.

## Production Docker

Copy `.env.example` to `.env`, change `BOOTSTRAP_PASSWORD`, then run:

```bash
docker compose up -d --build
```

The root `docker-compose.yml` is the production stack. It mounts separate volumes for `/vaults` and `/data`.

## Test Stack

The dev/test stack lives in `./test/docker-compose.yml` and uses separate test volumes.

Render config:

```bash
docker compose --env-file test/.env.test.example -f test/docker-compose.yml config
```

Run the stack manually:

```bash
docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build
```

Run smoke tests against the already running test stack:

```bash
./test/run-smoke.sh
```

Stop the stack:

```bash
docker compose --env-file test/.env.test.example -f test/docker-compose.yml down
```

## Local Checks

```bash
go test ./...
go build -mod=vendor -buildvcs=false ./cmd/mdock
cd web && npm test
cd web && npm run build
docker compose config
docker compose --env-file test/.env.test.example -f test/docker-compose.yml config
```

Docker build uses vendored Go dependencies, so backend image builds do not need to download Go modules during the Docker build stage.
