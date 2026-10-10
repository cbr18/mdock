# Git Queue Persistence & Data Durability

Status: DONE
Created: 2026-10-07 14:30
Project: mdock
Plan: [2026_10_07_14_30_git_queue_persistence_and_durability.md](../plans/2026_10_07_14_30_git_queue_persistence_and_durability.md)

## Проблема

Текущая git queue хранится только в памяти (`internal/git/git.go: Queue.pending map[string]string`). При краше процесса, OOM kill, SIGKILL или потере питания:
- Pending файловые изменения теряются из очереди
- Commit message теряет информацию об источнике (`webdav` / `web` / `mixed`)
- При следующем старте `RecoveryCommit` создаёт коммит с `recovery:` вместо правильного атрибута источника
- Окно потери данных: от момента FS write до git commit (до `COMMIT_DEBOUNCE=5s` + время выполнения)

Также отсутствуют:
- Explicit `fsync` после критических файловых операций (WriteFile, Mkdir, Rename, Delete)
- Startup integrity checks (git fsck, SQLite PRAGMA integrity_check)
- `/metrics` endpoint для observability
- Backup verification script

## Доказательства

- `internal/git/git.go:369-391` — Queue.pending в памяти, флашится только по таймеру
- `internal/git/git.go:249-254` — RecoveryCommit подхватывает dirty state, но источник всегда `recovery:`
- `internal/vault/path.go:189-200` — WriteFile использует `os.WriteFile` без fsync
- `cmd/mdock/main.go:142-169` — initializeVaults не проверяет целостность git repo / SQLite
- Roadmap #19 (observability), #12 (restore workflow) требуют метрик и проверки целостности

## Нефункциональные ограничения

- Не ломать текущий API git queue (Enqueue, Flush, Close, RunExclusive)
- Не добавлять внешние зависимости (только SQLite, уже в проекте)
- Минимальное влияние на latency файловых операций (fsync ~1-5ms)
- Сохранить per-vault mutex semantics
- Не логировать секреты, пароли, session IDs

## Не входит в задачу

- Автоматические миграции схемы БД (только версионирование текущих)
- PostgreSQL/MySQL миграция
- Cross-region DR
- Point-in-time recovery (только full backup restore)

## Желаемое поведение

1. **Persistent Git Queue**: pending tasks сохраняются в SQLite таблицу `git_queue_pending(vault_id, path, source, created_at)` при каждом `Enqueue`. При успешном `Flush` — удаляются. При старте — replay pending перед RecoveryCommit.
2. **FSync на критические FS ops**: `WriteFile`, `Mkdir`, `Rename`, `Delete` в `vault.Service` делают `fsync` на файле/директории после записи.
3. **Startup Integrity Check**: при инициализации vaults — `git fsck`, `PRAGMA integrity_check`, проверка доступности vault root. При ошибке — лог + не фатальный (degraded mode).
4. **`/metrics` endpoint**: Prometheus text format — `git_queue_len{vault="slug"}`, `git_queue_pending{vault="slug"}`, `git_commit_duration_seconds`, `git_dirty{vault="slug"}`, `lock_wait_duration_seconds`, `webdav_errors_total`, `api_request_duration_seconds`.
5. **Backup verification script**: `scripts/verify-backup.sh` проверяет SQLite integrity, git repo health, читаемость vault files.

## Затронутые области

- `internal/git/queue.go` — persistent queue logic
- `internal/git/registry.go` — QueueRegistry передаёт DB для persistence
- `internal/store/store.go` — новая таблица `git_queue_pending`, методы CRUD
- `internal/vault/path.go` — fsync в WriteFile, Mkdir, Rename, Delete
- `cmd/mdock/main.go` — startup integrity checks в initializeVaults
- `internal/httpapi/router.go` — `/metrics` handler
- `scripts/verify-backup.sh` — новый скрипт
- `docs/deployment.md` — документация метрик и verification
- `tests` — unit + smoke tests для новых фич

## Заметки по реализации

### Persistent Queue (SQLite-backed)
```sql
CREATE TABLE git_queue_pending (
  vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,  -- RFC3339Nano
  PRIMARY KEY (vault_id, path)
);
```
- `Enqueue`: INSERT OR REPLACE (path уникален per vault)
- `Flush`: после успешного commit — DELETE WHERE vault_id=?
- `Startup replay`: SELECT * FROM git_queue_pending WHERE vault_id=? → Enqueue в память → Flush → RecoveryCommit
- QueueRegistry хранит `*sql.DB` и передаёт в Queue

### FSync
```go
func (s *Service) WriteFile(...) error {
  // ... existing code ...
  if err := os.WriteFile(full, data, 0o644); err != nil { return err }
  if f, err := os.Open(full); err == nil { f.Sync(); f.Close() }
  return nil
}
```
Аналогично для Mkdir (sync parent dir), Rename (sync new parent), Delete (sync parent).

### Startup Integrity
```go
func checkVaultIntegrity(ctx context.Context, root string) error {
  // git fsck
  // PRAGMA integrity_check
  // os.Stat root
}
```

### Metrics
Lightweight, no external deps. `expvar` или custom handler. Формат Prometheus text.

## Критерии приёмки

1. `go test ./...` — все тесты проходят
2. `npm test` — frontend тесты проходят
3. `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — stack поднимается
4. `./test/run-smoke.sh` — smoke тесты проходят (включая WebDAV/Remotely Save compat)
5. **Chaos test**: kill -9 процесс во время активной синхронизации → restart → проверить:
   - Все файлы на месте
   - Git history имеет правильные commit messages (не только recovery:)
   - Нет потерянных операций
6. `/metrics` возвращает Prometheus text format с ожидаемыми метриками
7. `scripts/verify-backup.sh` на test stack проходит без ошибок

## План тестирования

- Unit tests: `internal/git/queue_test.go` (persistent queue), `internal/vault/path_test.go` (fsync), `internal/store/store_test.go` (git_queue_pending CRUD)
- Integration: `test/smoke/smoke_test.go` расширить на проверку persistence после kill -9
- Manual chaos: `docker compose -f test/docker-compose.yml kill -s KILL mdock` → restart → verify

## Результаты валидации

(заполняется после реализации)

## Откат

1. Удалить таблицу `git_queue_pending` (migration не нужна, таблица создаётся в init)
2. Вернуть in-memory Queue.pending логику
3. Убрать fsync вызовы
4. Убрать startup integrity checks
5. Убрать /metrics endpoint
6. Удалить verify-backup.sh