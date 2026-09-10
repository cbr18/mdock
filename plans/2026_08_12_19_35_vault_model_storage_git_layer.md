# Vault model, storage и git layer

Task: [12_08_2026_19_35_vault_model_storage_git_layer.md](../tasks/12_08_2026_19_35_vault_model_storage_git_layer.md)

## Последовательность реализации

1. Обновить config/env:
   - перейти от single-vault path к `VAULTS_ROOT`;
   - обновить defaults;
   - обновить Docker compose, test compose, env examples и README.
2. Расширить SQLite schema:
   - добавить `vaults`;
   - добавить `vault_members`;
   - обновить `file_locks` под `vault_id`;
   - сохранить idempotent init и WAL mode.
3. Реализовать repository методы в `internal/store`:
   - create/get user;
   - create/get personal vault;
   - list vaults by user;
   - create membership;
   - idempotent bootstrap user + personal vault.
4. Реализовать `internal/vault` service:
   - resolve vault root по metadata;
   - safe path resolve;
   - symlink escape protection;
   - list/read/write/mkdir/rename/delete;
   - запрет `.git`.
5. Реализовать `internal/git` CLI adapter:
   - `InitIfNeeded`;
   - `EnsureMainBranch`;
   - `StatusPorcelain`;
   - `HasChanges`;
   - `Add`;
   - `Commit`;
   - no-op behavior when clean.
6. Реализовать startup vault initialization:
   - для всех известных vaults создать директорию;
   - init git repo;
   - ensure `main`;
   - recovery commit, если dirty.
7. Реализовать per-vault git queue:
   - registry queues by vault id;
   - debounce grouping;
   - sequential worker per vault;
   - независимая работа разных vault queues.
8. Реализовать SQLite-backed locks:
   - acquire;
   - heartbeat;
   - release;
   - expired cleanup;
   - конфликт только по `vault_id + path`;
   - no read locks.
9. Добавить минимальные API/service hooks для smoke validation:
   - list current user vaults;
   - personal vault наличие и metadata;
   - отдельный file write endpoint не добавлять в этой задаче, так как полноценный write path пойдёт через будущий WebDAV/API слой.
10. Обновить smoke tests:
    - login;
    - list vaults;
    - personal vault exists;
    - git repo initialized;
    - personal vault доступен текущему пользователю.
11. Обновить документацию:
    - README команды/env;
    - task validation results;
    - при необходимости уточнить docs по storage/git decisions.

## Проверки

- `go test ./...`
- `go build -mod=vendor -buildvcs=false -o /tmp/mdock ./cmd/mdock`
- `cd web && npm test`
- `cd web && npm run build`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- `docker compose up -d --build`
- health/auth/personal-vault checks
- `docker compose down`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down`

## Риски

- Переход к `VAULTS_ROOT` затрагивает config, Docker, docs и tests; легко оставить старое single-vault имя в одном месте.
- Git tests зависят от наличия системного `git` в окружении.
- `git init` default branch может отличаться по версии/config git; нужно явно приводить к `main`.
- Recovery commit не должен создавать пустые коммиты.
- Symlink escape protection нужно тестировать отдельно, иначе path safety будет неполной.
- SQLite locks должны быть лёгкими; нельзя превратить их в глобальный mutex на vault.
- Per-vault queue должна корректно завершаться при shutdown, иначе тесты могут флейкать.
- Docker build сейчас использует `vendor/`; при изменении Go dependencies нужно обновлять vendor.

## Заметки по откату

Откатить изменения слоёв `config`, `store`, `vault`, `git`, `locks`, `server`, env examples и compose-файлов. Не удалять реальные vault directories, SQLite DB или Docker volumes без отдельного запроса.
