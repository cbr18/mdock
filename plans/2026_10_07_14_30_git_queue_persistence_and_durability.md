# Plan: Git Queue Persistence & Data Durability

Task: [2026_10_07_14_30_git_queue_persistence_and_durability.md](../tasks/2026_10_07_14_30_git_queue_persistence_and_durability.md)

## Последовательность реализации

### Phase 1: Persistent Git Queue (SQLite-backed) — Core ✅ DONE

1. **Store: новая таблица и методы** (`internal/store/store.go`) ✅
   - Добавить `CREATE TABLE git_queue_pending` в `migrate()` (migration #4)
   - Методы: `EnqueuePending(ctx, vaultID, path, source)`, `FlushPending(ctx, vaultID)`, `ListPending(ctx, vaultID)`, `DeletePending(ctx, vaultID, path)`
   - Все методы используют prepared statements, параметризованные запросы

2. **Git Queue: persistence логика** (`internal/git/git.go`) ✅
   - `Queue` struct добавить `db *sql.DB` поле и `vaultID int64`
   - `NewQueue` принимать `db *sql.DB`, `vaultID int64`
   - `Enqueue`: после in-memory update → `store.EnqueuePending`
   - `flush`: после успешного commit → `store.FlushPending`
   - `Startup replay`: новый метод `ReplayPending(ctx)` — читает из store, делает Enqueue в память, затем flush

3. **QueueRegistry: передача DB** (`internal/git/registry.go`) ✅
   - `QueueRegistry` хранить `*sql.DB`
   - `For(vaultID, repoPath)` передавать DB и vaultID в `NewQueue`

4. **App Service: wiring** (`internal/app/service.go`) ✅
   - `NewQueueRegistry` получает `st.DB()`
   - `PrepareVault` вызывать `queue.ReplayPending` перед `RecoveryCommit`

5. **Main: startup sequence** (`cmd/mdock/main.go`) ✅
   - В `initializeVaults`: для каждого vault → `queue.ReplayPending` → `RecoveryCommit`

### Phase 2: FSync на файловые операции ✅ DONE

6. **Vault Service: fsync helpers** (`internal/vault/path.go`) ✅
   - `syncPath(path string) error` — открыть файл/директорию, `Sync()`, `Close()`
   - `WriteFile`: после `os.WriteFile` → `syncPath(full)`
   - `Mkdir`: после `os.MkdirAll` → `syncPath(full)`
   - `Rename`: после `os.Rename` → `syncPath(filepath.Dir(newFull))` + `syncPath(filepath.Dir(oldFull))`
   - `Delete`: после `os.RemoveAll` → `syncPath(filepath.Dir(full))`

### Phase 3: Startup Integrity Checks ✅ DONE

7. **Integrity checker** (`internal/app/service.go`) ✅
   - `CheckVaultIntegrity(ctx, repoPath) error` — `git fsck --strict`
   - `CheckSQLiteIntegrity(ctx) error` — `PRAGMA integrity_check`
   - `CheckVaultRoot(root string) error` — `os.Stat`, права доступа

8. **Main: integrate checks** (`cmd/mdock/main.go`) ⚠️ PENDING
   - В `initializeVaults`: после `EnsureVault` → запускать проверки
   - При ошибке: `logger.Error("vault integrity check failed", "vault", path, "error", err)` — НЕ фатально, degraded mode

### Phase 4: /metrics endpoint ✅ DONE

9. **Metrics collector** (`internal/httpapi/metrics.go`) ✅
   - Struct `Metrics` с atomic counters / gauges
   - `RecordGitQueueLen`, `RecordGitCommitDuration`, `RecordLockWait`, `RecordWebDAVError`, `RecordAPIRequest`
   - `Handler() http.Handler` — Prometheus text format output

10. **Wire metrics** (`internal/httpapi/router.go`) ✅
    - Добавить `/metrics` endpoint
    - Собирать текущие метрики при запросе

### Phase 5: Backup Verification Script ✅ DONE

11. **scripts/verify-backup.sh** ✅
    - Аргументы: `--data-dir`, `--vaults-root`, `--backup-file` (опционально)
    - Проверки:
      - `sqlite3 <db> "PRAGMA integrity_check"` → ok
      - `sqlite3 <db> "SELECT COUNT(*) FROM users"` → >0
      - Для каждого vault в vaults-root: `git -C <vault> fsck --strict` → ok
      - Читаемость sample файлов: `head -c 100 <file>`
      - Если `--backup-file` задан: распаковать, проверить DDL/DML структура

### Phase 6: Tests & Documentation ⚠️ PENDING

12. **Unit tests** — добавить тесты для persistent queue, fsync, git_queue_pending CRUD
13. **Smoke test extension** (`test/smoke/smoke_test.go`) — chaos test после kill -9
14. **Docs** (`docs/deployment.md`, `docs/server-api.md`) — документация метрик и verification

---

## Проверки

| Этап | Проверка | Команда |
|------|----------|---------|
| 1-5 | Unit tests | `go test ./internal/git/... ./internal/store/... ./internal/vault/...` |
| 1-5 | Build | `go build -mod=vendor -buildvcs=false ./cmd/mdock` |
| 6-7 | FSync не ломает тесты | `go test ./...` |
| 8 | Integrity checks логируются | `grep "integrity" logs` |
| 9-10 | `/metrics` возвращает text | `curl http://localhost:8080/metrics` |
| 11 | verify-backup.sh работает | `./scripts/verify-backup.sh --data-dir /data --vaults-root /vaults` |
| 12 | All tests pass | `go test ./... && cd web && npm test` |
| 13 | Smoke tests | `./test/run-smoke.sh` |
| 14 | Chaos test | `docker kill -s KILL mdock_test` → restart → verify |

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| FSync добавит заметную latency на Web App save | Средняя | Низкое | FSync только на запись, не на чтение; 1-5ms acceptable для markdown |
| SQLite lock contention при частых Enqueue | Низкая | Среднее | Per-vault queue уже сериализует; pending таблица маленькая |
| git fsck медленный на больших repo | Низкая | Низкое | Запускать только на startup, не блокировать HTTP; timeout 30s |
| Metrics endpoint утекает внутренние детали | Низкая | Низкое | Только агрегированные счетчики, без путей/пользователей |
| verify-backup.sh даёт false positive | Средняя | Низкое | Проверить на известном good/bad backup |

---

## Заметки по откату

1. **Persistent queue**: убрать `db` из `Queue`, вернуть in-memory `pending map`, удалить вызовы `store.EnqueuePending/FlushPending`, удалить таблицу из `migrate()` (или оставить, не мешает)
2. **FSync**: закомментировать вызовы `syncPath` в `WriteFile/Mkdir/Rename/Delete`
3. **Integrity checks**: закомментировать вызовы в `initializeVaults`
4. **Metrics**: убрать `/metrics` route, удалить `Metrics` struct, убрать вызовы `Record*`
5. **verify-backup.sh**: удалить файл

Все изменения локальны, не затрагивают внешние контракты API/WebDAV.