FROM node:22-bookworm-slim AS frontend
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
COPY webdist/ /src/webdist/
RUN npm run build

FROM golang:1.26-bookworm AS backend
WORKDIR /src
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY . .
COPY --from=frontend /src/webdist/dist ./webdist/dist
RUN CGO_ENABLED=0 go build -mod=vendor -buildvcs=false -o /out/mdock ./cmd/mdock

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /out/mdock /usr/local/bin/mdock
ENV HTTP_ADDR=:8080 \
  VAULTS_ROOT=/vaults \
  DATA_DIR=/data \
  BACKUP_DIR=/backups \
  GIT_BIN=git \
  DEFAULT_FILE_ROOT="Obsidian Vault"
VOLUME ["/vaults", "/data", "/backups"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["mdock"]
