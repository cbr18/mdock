# Plan: Vault — fsync при файловых операциях

Task: [2026_10_07_17_45_vault_write_fsync_durability.md](../tasks/2026_10_07_17_45_vault_write_fsync_durability.md)

## Последовательность реализации

1. **Config flag** (`internal/config/config.go`)
   - Добавить `FsyncWrites bool` в `Config`.
   - `FsyncWrites: getBoolEnv("FSYNC_WRITES", true)` (default `true`, без обязательного изменения `.env`).
   - Обновить `internal/config/config_test.go` на default и parse `false`.

2. **Vault helpers** (`internal/vault/path.go`)
   - Добавить `syncFile(path string) error` и `syncDir(path string) error` (best-effort для каталога: игнорировать `EINVAL`/`ENOTSUP`/`ENOSYS`).
   - Добавить поле `fsyncWrites bool` в `Service`.

3. **Конструктор** (`internal/vault/path.go`)
   - `NewService(root string, fsyncWrites bool) (*Service, error)`.
   - Обновить вызовы: `internal/app/service.go:69`, `cmd/mdock/main.go:62`.

4. **Вызовы sync** (`internal/vault/path.go`)
   - `WriteFile`: `syncFile(full)` после успешной записи.
   - `Mkdir`: `syncDir(filepath.Dir(full))` после `MkdirAll`.
   - `Rename`: `syncDir(filepath.Dir(newFull))` и `syncDir(filepath.Dir(oldFull))` после `Rename`.
   - `Delete`: `syncDir(filepath.Dir(full))` после `RemoveAll`.
   - Все вызовы только при `s.fsyncWrites`.

5. **Тесты** (`internal/vault/path_test.go`)
   - Обновить существующие `NewService(..., true)`.
   - Добавить кейсы из плана тестирования задачи.

6. **Документация** (`docs/deployment.md`)
   - Добавить `FSYNC_WRITES=true` в список env с пояснением про opt-out.

## Проверки

| Этап | Проверка | Команда |
|------|----------|---------|
| 1 | Config tests | `go test ./internal/config/...` |
| 1-4 | Build | `go build -mod=vendor -buildvcs=false ./cmd/mdock` |
| 2-5 | Vault tests | `go test ./internal/vault/...` |
| 1-5 | Все Go tests | `go test ./...` |
| 3-4 | Opt-out регресс | `FSYNC_WRITES=false go test ./internal/vault/...` |
| 6 | Smoke на тестовом стеке | поднять `test/`, save через web UI и WebDAV PUT |

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Latency на сохранение (web + WebDAV PUT) | Средняя | Низкое | Один `fsync` на файл + один на каталог; при необходимости `FSYNC_WRITES=false` |
| `fsync` каталога не поддержан на части ФС | Низкая | Низкое | `syncDir` best-effort, игнорирует `EINVAL`/`ENOTSUP`/`ENOSYS` |
| Изменение сигнатуры `NewService` рвёт вызовы/тесты | Низкая | Низкое | Обновить все 4 вызова в одной правке; покрыто `go test ./...` |
| Default `true` меняет поведение по умолчанию | Низкая | Низкое | Это и есть цель задачи; opt-out через env без правки `.env` |
| Синхронизация vault root при `Delete`/`Mkdir` в корне | Низкая | Низкое | Best-effort, ошибки не фатальны |

## Заметки по откату

1. Убрать `syncFile`/`syncDir` и их вызовы из `WriteFile`/`Mkdir`/`Rename`/`Delete`.
2. Вернуть `NewService(root string)`, обновить 4 вызова.
3. Убрать `Config.FsyncWrites` и разбор `FSYNC_WRITES`.
4. Откатить правки `docs/deployment.md`.

Изменения локальны; публичные API/WebDAV контракты, формат данных и лимиты не меняются.
