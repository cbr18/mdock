# Git Queue: сохранять pending при ошибке flush

Status: CREATED
Created: 2026-10-07 17:40
Project: mdock
Plan: [2026_10_07_17_40_git_queue_flush_error_retention.md](../plans/2026_10_07_17_40_git_queue_flush_error_retention.md)

## Проблема

`Queue.flush` (`internal/git/git.go:438-468`) перед git-операциями безусловно очищает `q.pending` (`git.go:450`). Если `client.Add` или `client.Commit` возвращает ошибку, pending paths/sources уже потеряны:

- изменения остаются на диске, но повторного коммита по таймеру не будет;
- `queue.Len()` возвращает `0`, то есть очередь «врёт» о состоянии;
- при следующем старте `RecoveryCommit` закоммитит dirty-состояние с источником `recovery:` вместо реального `web`/`webdav`, то есть теряется атрибуция источника.

Это реальный дефект, не требующий ни БД, ни изменения формата commit message. Durable queue (SQLite) для него не нужна.

## Доказательства

- `internal/git/git.go:450` — `q.pending = map[string]string{}` выполняется до `Add`/`Commit`.
- `internal/git/git.go:456-465` — при ошибке `Add`/`Commit` snapshot pending не восстанавливается, таймер уже сработал.
- `internal/git/git.go:398-400` — таймер одноразовый: после срабатывания повтор не планируется.
- `internal/git/git_test.go:200-315` — покрыт только успешный flush и flush с уменьшившимся числом файлов; сбой git не покрыт.

## Нефункциональные ограничения

- Не менять публичный API `Queue`: `Enqueue`, `Flush`, `Close`, `RunExclusive`, `Len`, `LastError`.
- Не добавлять SQLite, БД или внешние зависимости.
- Сохранить per-vault mutex semantics (`runMu`) и debounce-поведение.
- Retry после ошибки не должен превращаться в busy-loop: повтор привязан к `debounce`, а не к немедленному циклу.
- Не логировать секреты (пути и источники секретом не являются).
- Не менять формат commit message (`sync(...)`, `recovery:`).

## Не входит в задачу

- Durable/persistent git queue на SQLite — не требуется для этого дефекта.
- fsync файловых операций (см. отдельную задачу).
- `/metrics` endpoint.
- Startup integrity checks (`git fsck`, `PRAGMA integrity_check`).
- Backup verification script.
- Изменение формата commit message или его источника.

## Желаемое поведение

1. Pending paths/sources не теряются при ошибке `Add`/`Commit`.
2. После неуспешного flush задачи сохраняются и планируется повторный flush через `debounce`, если очередь не закрыта.
3. Успешный flush по-прежнему очищает обработанные задачи.
4. Задачи, добавленные через `Enqueue` во время выполнения flush, не затираются и не теряются.
5. При `Close` таймер не остаётся активным; pending сохраняется в памяти до завершения процесса.
6. `Len()` и `LastError()` отражают фактическое состояние очереди.

## Затронутые области

- `internal/git/git.go` — `flush`, `Enqueue`, helper постановки таймера и восстановления snapshot
- `internal/git/git_test.go` — новые unit-тесты
- `docs/git-vaults.md` — уточнить поведение при сбое flush (текущий текст описывает только recovery при рестарте)

## Заметки по реализации

Ключевая идея: не очищать сделанную «снимком» часть pending, пока git-операция не завершилась успешно; при ошибке — вернуть её и перевооружить таймер.

1. Вынести постановку таймера в helper `armTimerLocked()` (вызывать под `q.mu`), использовать его в `Enqueue`:

```go
func (q *Queue) armTimerLocked() {
    if q.closed {
        return
    }
    if q.timer != nil {
        q.timer.Stop()
    }
    q.timer = time.AfterFunc(q.debounce, func() {
        q.flush(context.Background())
    })
}
```

2. В `flush` снимать snapshot вместо простой очистки и восстанавливать его при ошибке:

```go
q.mu.Lock()
snapshot := q.pending
paths := make([]string, 0, len(snapshot))
sources := map[string]struct{}{}
for path, source := range snapshot {
    if path != "" {
        paths = append(paths, path)
    }
    if source != "" {
        sources[source] = struct{}{}
    }
}
q.pending = map[string]string{}
q.mu.Unlock()

// ... runMu, Add, Commit как сейчас ...

// при ошибке Add/Commit:
q.restorePending(snapshot)
q.setLastErr(err)
return err
```

3. `restorePending` выполняет merge-only-missing, чтобы не затирать более новые `Enqueue`, и перевооружает таймер:

```go
func (q *Queue) restorePending(snapshot map[string]string) {
    q.mu.Lock()
    defer q.mu.Unlock()
    for path, source := range snapshot {
        if _, exists := q.pending[path]; !exists {
            q.pending[path] = source
        }
    }
    if len(q.pending) > 0 {
        q.armTimerLocked()
    }
}
```

4. `Close` продолжает выставлять `closed=true` до вызова `flush`; `armTimerLocked` учитывает `closed` и не планирует повтор.

Замечания:
- `Commit` возвращает `(false, nil)` на чистом репозитории — это успех, snapshot корректно отбрасывается.
- При `Add` успех + `Commit` ошибка файлы уже staged; повторный `Add` перед `Commit` идемпотентен.

## Критерии приёмки

1. `go test ./internal/git/...` — зелёный.
2. `go build -mod=vendor -buildvcs=false ./cmd/mdock` — собирается.
3. `go test ./...` — зелёный.
4. Симуляция сбоя git (например, `repoPath` без `git init` или недоступный `GIT_BIN`): `Enqueue` → `Flush` возвращает ошибку → `Len() > 0`, `LastError() != nil`; после восстановления git повторный `Flush` коммитит с правильным сообщением.
5. `Enqueue` во время flush не приводит к потере задач.

## План тестирования

- Unit (`internal/git/git_test.go`):
  - `TestQueueRetainsPendingOnFlushError`: `NewQueue(client, <path без git init>, time.Hour)` → `Enqueue(Task{Source:"test", Paths:["note.md"]})` → `Flush` → ошибка → `Len() == 1` → `client.InitIfNeeded`/`EnsureMainBranch` → `Flush` успешен → в `Log` сообщение `sync(test): update 1 file`.
  - `TestQueueRetryArmsTimerAfterError`: тот же сценарий с коротким `debounce` (например `20ms`); после ошибки дождаться, что таймер перевооружён и повторный `flush` произошёл (проверить `LastError`/`Log` при восстановленном git).
  - `TestQueueEnqueueDuringFlushNotLost`: `Enqueue` второго пути в момент между snapshot и завершением flush не теряется (после успешного flush оба изменения в истории).
  - `TestQueueFlushSuccessClearsPending`: существующий `TestQueueFlushCommitsPendingFiles` уже покрывает успешное очищение.
- Регресс: `go test ./internal/git/...`, затем `go test ./...`.

## Результаты валидации

(заполняется после реализации)

## Откат

1. Вернуть в `flush` безусловную очистку `q.pending` без `restorePending`.
2. Убрать `restorePending` и вернуть постановку таймера inline в `Enqueue`.
3. Вернуть документацию `docs/git-vaults.md` к прежнему тексту.

Изменения локальны в `internal/git` и не затрагивают API, WebDAV и формат commit message.
