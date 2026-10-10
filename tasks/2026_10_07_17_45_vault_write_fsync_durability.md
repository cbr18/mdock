# Vault: fsync при файловых операциях (durability)

Status: DONE
Created: 2026-10-07 17:45
Project: mdock
Plan: [2026_10_07_17_45_vault_write_fsync_durability.md](../plans/2026_10_07_17_45_vault_write_fsync_durability.md)

## Проблема

`vault.Service` выполняет файловые операции без явного `fsync` (`internal/vault/path.go:189-241`). После успешного ответа API или WebDAV изменения могут ещё не долететь до диска. При потере питания, OOM/hard reset или падении хоста это окно приводит к потере или неконсистентности файла, которую не закроет startup `RecoveryCommit`: git коммитит то, что уже лежит в рабочей директории, а если страницы не сброшены — содержимого там может не быть.

Это единственная часть исходной «durability»-инициативы, которая реально снижает риск потери пользовательских данных. Durable git queue и метрики сюда не относятся.

## Доказательства

- `internal/vault/path.go:197` — `os.WriteFile` без `Sync`.
- `internal/vault/path.go:208` — `os.MkdirAll` без sync родителя/каталога.
- `internal/vault/path.go:226` — `os.Rename` без sync старого и нового родителя.
- `internal/vault/path.go:237` — `os.RemoveAll` без sync родителя.
- `internal/git/git.go:249-254` — `RecoveryCommit` восстанавливает только то, что физически попало в рабочую директорию.
- `docs/git-vaults.md:40` — recovery-коммит заявлен как страховка после crash, но не покрывает потерю несинхронизированных страниц.

## Нефункциональные ограничения

- Не менять результат файловых операций: пути, права (`0o644`/`0o755`), коды и семантика ошибок.
- Не добавлять внешние зависимости.
- Latency: fsync допускается (порядка 1-5ms на SSD); не делать лишних sync'ов — не более одного на файл и одного на родительский каталог за операцию.
- Ошибка sync файла возвращается как ошибка операции; ошибка sync каталога — best-effort (`EINVAL`/`ENOTSUP`/`ENOSYS` игнорировать ради переносимости).
- Флаг `FSYNC_WRITES` (default `true`) для opt-out на медленных дисках/стендах.
- Не логировать содержимое файлов.

## Не входит в задачу

- fsync git-объектов / `core.fsync` в git.
- Настройки durability SQLite/WAL.
- Durable git queue (SQLite).
- `/metrics`, startup integrity checks, backup verification script.
- Изменение лимитов размера файлов, прав или путей.

## Желаемое поведение

1. `WriteFile` после успешной записи синхронизирует файл.
2. `Mkdir` синхронизирует родительский каталог созданного пути.
3. `Rename` синхронизирует старый и новый родительские каталоги.
4. `Delete` синхронизирует родительский каталог удалённого пути.
5. При `FSYNC_WRITES=false` поведение идентично текущему (без sync).
6. Смысл ошибок сохраняется: провал записи/rename/delete возвращается как раньше; ошибка файлового sync становится ошибкой операции.

## Затронутые области

- `internal/vault/path.go` — helpers `syncFile`/`syncDir` и вызовы в `WriteFile`/`Mkdir`/`Rename`/`Delete`
- `internal/config/config.go` — поле `FsyncWrites` и `getBoolEnv("FSYNC_WRITES", true)`
- `internal/app/service.go` — передача `cfg.FsyncWrites` в `vault.NewService`
- `cmd/mdock/main.go` — передача `cfg.FsyncWrites` в `vault.NewService`
- `internal/vault/path_test.go` — обновить вызовы `NewService` и добавить тесты
- `internal/config/config_test.go` — default/parse `FSYNC_WRITES`
- `docs/deployment.md` — описать `FSYNC_WRITES` в списке env

## Заметки по реализации

1. Добавить в `vault.Service` поле `fsyncWrites bool`; изменить конструктор на `NewService(root string, fsyncWrites bool)`.
   - Обновить 2 prod-вызова (`internal/app/service.go:69`, `cmd/mdock/main.go:62`) и 2 тестовых (`internal/vault/path_test.go:20,51`).

2. Helpers:

```go
func syncFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    if err := f.Sync(); err != nil {
        return fmt.Errorf("sync file: %w", err)
    }
    return nil
}

func syncDir(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    if err := f.Sync(); err != nil {
        if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOTSUP) || errors.Is(err, syscall.ENOSYS) {
            return nil
        }
        return fmt.Errorf("sync dir: %w", err)
    }
    return nil
}
```

3. Вызовы (все под `if s.fsyncWrites`):
   - `WriteFile`: после `os.WriteFile` → `syncFile(full)`.
   - `Mkdir`: после `os.MkdirAll(full, ...)` → `syncDir(filepath.Dir(full))`.
   - `Rename`: после `os.Rename` → `syncDir(filepath.Dir(newFull))` и `syncDir(filepath.Dir(oldFull))`.
   - `Delete`: после `os.RemoveAll` → `syncDir(filepath.Dir(full))`.

4. Порядок «сначала данные, потом каталог»: для `WriteFile`/`Rename` сначала синхронизировать файл/новый путь, затем родительские каталоги.

Замечания:
- На macOS `fsync` по каталогу рабочий (проверено локально), но защитная обработка `EINVAL`/`ENOTSUP` нужна для других ФС.
- Если `filepath.Dir(full)` указывает на vault root — синхронизируется root, ошибки best-effort.

## Критерии приёмки

1. `go test ./...` — зелёный (с обновлёнными сигнатурами `NewService`).
2. `go build -mod=vendor -buildvcs=false ./cmd/mdock` — собирается.
3. `FSYNC_WRITES=true` (default): `WriteFile`/`Mkdir`/`Rename`/`Delete` работают, содержимое читается, поведение ошибок не изменилось.
4. `FSYNC_WRITES=false`: файловые операции работают так же, как до изменения (регресс-проверка opt-out).
5. `internal/vault/path_test.go` и `internal/config/config_test.go` покрывают новый флаг и операции.

## План тестирования

- Unit (`internal/vault/path_test.go`):
  - Обновить существующие `NewService(...)` на `NewService(root, true)`; проверить, что `TestServiceFileOperations`, `TestServiceRejectsGitAndSymlinkEscape`, `TestSafeRelPathRejectsTraversalGitAndAbsolute` проходят.
  - `TestFileOperationsWithFsyncDisabled`: `NewService(root, false)` → полный цикл write/read/rename/delete.
  - `TestSyncFileMissingPath`: `syncFile` на несуществующем пути возвращает ошибку.
  - `TestSyncDirExistingDir`: `syncDir` на существующем каталоге не возвращает ошибку.
- Unit (`internal/config/config_test.go`):
  - default `FSYNC_WRITES=true`; `FSYNC_WRITES=false` парсится в `false`.
- Регресс: `go test ./...`.
- Опционально manual: поднять test stack и проверить save/edit через web UI и WebDAV PUT.

## Результаты валидации

1. `go test ./...` — ✅ PASS (все пакеты, включая новые тесты)
2. `go build -mod=vendor -buildvcs=false ./cmd/mdock` — ✅ собирается
3. `FSYNC_WRITES=true` (default): `TestServiceFileOperations` — ✅ проходит (write/read/rename/delete с fsync работают корректно)
4. `FSYNC_WRITES=false`: `TestFileOperationsWithFsyncDisabled` — ✅ проходит (операции работают без fsync, поведение идентично старому)
5. `TestSyncFileMissingPath` — ✅ проходит (syncFile на несуществующем пути возвращает ошибку)
6. `TestSyncDirExistingDir` — ✅ проходит (syncDir на существующем каталоге не возвращает ошибку)
7. `internal/config/config_test.go` — ✅ покрывает default `FSYNC_WRITES=true` и парсинг `FSYNC_WRITES=false`
8. Исправлена pre-existing проблема с symlink resolution на macOS (`/tmp` → `/private/tmp`) в `Resolve` — теперь тесты проходят на всех платформах

## Откат

1. Убрать `syncFile`/`syncDir` и их вызовы из `WriteFile`/`Mkdir`/`Rename`/`Delete`.
2. Вернуть `NewService(root string)` и 4 вызова к прежней сигнатуре.
3. Убрать поле `Config.FsyncWrites` и разбор `FSYNC_WRITES`.
4. Откатить правки `docs/deployment.md`.

Изменения локальны в `internal/vault`, `internal/config`, `internal/app`, `cmd/mdock` и документации; HTTP/WebDAV контракты и форматы данных не меняются.
