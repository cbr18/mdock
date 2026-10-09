# Plan: Git Queue — сохранять pending при ошибке flush

Task: [2026_10_07_17_40_git_queue_flush_error_retention.md](../tasks/2026_10_07_17_40_git_queue_flush_error_retention.md)

## Последовательность реализации

1. **Helper постановки таймера** (`internal/git/git.go`)
   - Добавить `armTimerLocked()` (останавливает старый таймер, ставит новый через `time.AfterFunc(q.debounce, ...)`, учитывает `q.closed`).
   - Перевести `Enqueue` и `Close` на использование helper'а.

2. **Snapshot вместо очистки** (`internal/git/git.go`)
   - В `flush` под `q.mu` сохранить `snapshot := q.pending` и заменить `pending` на пустой map.
   - `paths`/`sources` строить из snapshot (как сейчас).

3. **Восстановление при ошибке** (`internal/git/git.go`)
   - Добавить `restorePending(snapshot map[string]string)`: merge-only-missing (не затирать более новые Enqueue) + `armTimerLocked()` при непустом pending.
   - Вызывать `restorePending(snapshot)` перед `setLastErr(err)` в обеих ветках ошибки (`Add`, `Commit`).

4. **Документация** (`docs/git-vaults.md`)
   - Уточнить в разделе про queue/commit message: при сбое flush pending сохраняется и повторяется по debounce; recovery-коммит остаётся страховкой на жёсткий crash.

5. **Тесты** (`internal/git/git_test.go`)
   - Добавить кейсы из плана тестирования задачи; не ломать существующие сигнатуры (`NewQueue(client, repoPath, debounce)` не меняется).

## Проверки

| Этап | Проверка | Команда |
|------|----------|---------|
| 1-3 | Unit tests git | `go test ./internal/git/...` |
| 1-3 | Build | `go build -mod=vendor -buildvcs=false ./cmd/mdock` |
| 1-5 | Все Go tests | `go test ./...` |
| 1-3 | Симуляция сбоя | временно `GIT_BIN=/nonexistent` → `Len()>0`, `LastError()!=nil` |
| 4 | Документация согласована | ревью `docs/git-vaults.md` |

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Повторный flush по таймеру при постоянной ошибке git — редкие повторы каждые `debounce` | Низкая | Низкое | Повтор привязан к debounce (5s), не busy-loop; ошибка видна через `LastError()` |
| Merge-only-missing скрывает изменение source у повторно добавленного пути | Низкая | Низкое | Более новый source считается актуальным (совпадает с текущей in-memory моделью) |
| Гонка `Enqueue` во время `flush` | Низкая | Среднее | Snapshot + восстановление только отсутствующих путей; отдельный тест на concurrent Enqueue |
| Изменение поведения `Close` | Низкая | Низкое | `armTimerLocked` не планирует таймер при `closed=true` |

## Заметки по откату

1. Вернуть в `flush` прежнюю очистку `q.pending` и убрать `restorePending`/вызовы.
2. Вернуть inline-постановку таймера в `Enqueue`, убрать `armTimerLocked`.
3. Откатить правку `docs/git-vaults.md`.

Все изменения локальны в `internal/git` и документации; публичный API очереди, HTTP/WebDAV контракты и формат commit message не меняются.
