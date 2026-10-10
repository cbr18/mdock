# Update Safety, Backup Verification & Verified Upgrade Path

Status: DONE
Created: 2026-10-07 15:00
Project: mdock
Plan: [2026_10_07_15_00_update_safety_backup_verification.md](../plans/2026_10_07_15_00_update_safety_backup_verification.md)

## Проблема

Текущий `scripts/update.sh` делает SQL backup перед деплоем, но:
- Не проверяет, что backup валиден и восстанавливаем
- Не верифицирует upgrade path от предыдущей released версии на реальных данных
- Нет гарантии, что migration не удалит/повредит существующие заметки
- Нет автоматического rollback при неудаче
- Не документирован процедура ручного restore из backup

Требования AGENTS.md (Updates And Data Preservation):
- Existing vault notes — most valuable data, preserving them is hard requirement
- Update/migration/restart/recovery must never corrupt, truncate, alter, or delete existing notes
- After any update, all existing notes must remain readable and accessible through same paths
- Update/recovery/cleanup logic may only add git commits, never rewrite/reset/checkout over/remove note content
- Never run destructive git/file operations unless explicitly requested and proven safe
- Update flow must take backup before irreversible steps and keep previous state restorable
- Changes to storage/migrations/git/backup/update flow must be verified against real existing data and upgrade from previous released version

## Доказательства

- `scripts/update.sh` — делает `backup-sql.sh` перед `docker compose up -d --remove-orphans`, но нет verification step
- `scripts/backup-sql.sh` — создаёт SQL dump, но нет `restore-sql.sh` и нет verification
- `internal/store/store.go` — `migrate()` функция, но нет версионирования миграций, нет down-migrations
- Roadmap #12: "Vault restore workflow — Restore SQLite, Restore vault files from git, Restore whole server from backups — Без этого до 1.0.0 идти нельзя"
- `docs/deployment.md` — описывает backup, но не restore

## Нефункциональные ограничения

- Не ломать существующий update.sh flow
- Не добавлять внешние зависимости для backup/restore
- Rollback должен быть автоматическим опционально, но всегда возможным ручно
- Verification должен работать на real data, не только на пустом тестовом стеке

## Не входит в задачу

- Автоматические миграции схемы БД (только версионирование текущих)
- PostgreSQL/MySQL миграция
- Cross-region DR
- Point-in-time recovery (только full backup restore)

## Желаемое поведение

1. **Backup Verification**: `scripts/verify-backup.sh` (из предыдущей задачи) интегрирован в `update.sh` — backup проверяется перед применением обновления
2. **Restore Script**: `scripts/restore-sql.sh` — восстанавливает SQLite из backup, проверяет целостность
3. **Verified Upgrade Path**: CI/CD job, который деплоит предыдущую released версию, создаёт test data, делает update до current main, проверяет сохранность всех данных
4. **Migration Versioning**: таблица `schema_migrations(version, applied_at)` в SQLite, каждая миграция — отдельный файл с up/down (down может быть no-op для additive-only)
5. **Update Safety Checks**: перед `docker compose up` — проверка свободного места, здоровья БД, git repos
6. **Rollback Procedure**: documented + scripted: stop containers → restore SQLite → restart old version

## Затронутые области

- `scripts/update.sh` — добавить verification, pre-flight checks
- `scripts/backup-sql.sh` — ensure consistent output
- `scripts/restore-sql.sh` — новый скрипт
- `scripts/verify-backup.sh` — использовать в update
- `internal/store/store.go` — schema_migrations table, migration framework
- `internal/store/migrations.go` — разделить на версионированные файлы
- `docs/deployment.md` — документация restore, verified upgrade
- `.forgejo/workflows/prod-deploy.yml` — добавить verified upgrade test job
- `test/` — upgrade test scenario

## Заметки по реализации

### Migration Versioning
```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```
- Миграции в `internal/store/migrations/v001_initial.sql`, `v002_add_archived.sql` и т.д.
- `migrate()` применяет только те, которых нет в таблице
- Down migrations не обязательны для additive-only, но файл должен существовать

### Verified Upgrade Test (CI)
```yaml
# .forgejo/workflows/upgrade-test.yml
- Deploy previous tag (e.g. v0.1.0-alpha.1) to test env
- Seed real data: users, vaults, files, git history, locks, remote config
- Run update.sh --apply --target current-main
- Verify: all notes readable via WebDAV + Web UI, git history intact, locks work
```

### Restore Script
```bash
#!/usr/bin/env bash
# restore-sql.sh --data-dir /data --backup-file /backups/mdock-20260814T120000Z.sql
# 1. Stop mdock (or ensure no connections)
# 2. Backup current app.db → app.db.pre-restore
# 3. sqlite3 /data/app.db < backup.sql
# 4. PRAGMA integrity_check
# 5. Verify tables exist, row counts match
```

## Критерии приёмки

1. `scripts/verify-backup.sh` проходит на backup, созданном `backup-sql.sh`
2. `scripts/restore-sql.sh` восстанавливает БД, `PRAGMA integrity_check` = ok, все таблицы доступны
3. `update.sh --check` показывает доступные версии
4. `update.sh --apply` делает pre-flight checks (disk space, db health, git repos ok)
5. CI job `upgrade-test` проходит: deploy old → seed data → update → verify data integrity
6. Документированная rollback процедура работает на test stack

## План тестирования

- Unit: migration framework tests
- Integration: `test/smoke/smoke_test.go` + upgrade scenario
- Manual: deploy v0.1.0-alpha.1 → create real data → update to main → verify
- Chaos: kill update mid-way → verify rollback works

## Результаты валидации

(заполняется после реализации)

## Откат

1. Удалить schema_migrations таблицу из migrate()
2. Вернуть update.sh без verification
3. Удалить restore-sql.sh
4. Убрать upgrade-test job из CI