# Move server policy: locks and git

Status: DONE
Created: 2026-08-22 11:45
Project: mdock
Plan: [22_08_2026_11_45_move_server_policy_locks_git.md](../plans/22_08_2026_11_45_move_server_policy_locks_git.md)
Commits:
- `e91bed0` — `fix: enforce move lock policy`

## Проблема

После добавления перемещения файлов и папок в web UI нужно явно закрепить серверную политику: что происходит с git-коммитами и locks при move. Сейчас `MovePath` уже вызывает git enqueue после успешного rename, но поведение с locks для папок и конкурентным редактированием нужно проверить и, если нужно, усилить.

## Доказательства

- Пользователь спросил: "а при перемещении коммит создается млм не надо?"
- Пользователь спросил: "а что с локами если я например буду редачить в obsidian или вебе и потом попробуйю переместить?"
- В `internal/app/service.go` метод `MovePath` вызывает `enqueueVaultChange(ctx, item, []string{from, to})` после `vaultService.Rename`.
- `MovePath` использует `withFileMutationLock` для исходного path, но нужно проверить блокировку descendant locks при перемещении папки.

## Нефункциональные ограничения

- Не менять API contract без необходимости.
- Не ломать существующий web UI move и WebDAV write behavior.
- Не создавать git-задачу до успешного filesystem rename.
- Не делать тяжёлые глобальные locks на весь vault.
- Ошибки locks должны возвращаться как `423 Locked`.
- Ошибки конфликтов пути должны оставаться явными API-ошибками, без silent overwrite.

## Не входит в задачу

- Merge UI.
- Conflict branches.
- Undo move.
- Batch move.
- Изменение frontend drag-and-drop UX, кроме обработки новых server errors при необходимости.

## Желаемое поведение

- Успешный move файла или папки ставит git-задачу с source `web` и paths `[from, to]`.
- Если исходный файл залочен другим владельцем, move возвращает `423 Locked`.
- Если перемещается папка и внутри есть залоченный файл другим владельцем, move возвращает `423 Locked`.
- Если перемещается файл, который открыт текущим web-редактором тем же владельцем, поведение должно быть явно определено:
  - MVP-вариант: запретить move активного locked файла и вернуть понятный lock error.
- Если move успешен, lock state не должен остаться на старом path в неконсистентном состоянии.
- Git enqueue происходит только после успешного rename.

## Затронутые области

- `internal/app/service.go`
- `internal/locks/service.go`
- `internal/server/server_test.go`
- `internal/git/`
- `web/src/features/files/VaultFilesPanel.jsx` при необходимости обработки 423

## Заметки по реализации

- Начать с аудита `MovePath`, `withFileMutationLock`, `locks.Service.Get/Acquire/Release`.
- Проверить, есть ли метод поиска locks по prefix; если нет, добавить узкий метод для descendant locks внутри vault.
- Для folder move проверять locks по prefix `from/` до rename.
- Для same-owner lock определить политику явно в коде и тестах.
- Для git проверить queue len или commit после flush в server/git integration test.

## Критерии приёмки

- Есть тест, что move файла ставит git queue/commit.
- Есть тест, что move locked файла другим пользователем возвращает `423`.
- Есть тест, что move папки с locked descendant возвращает `423`.
- Есть тест, что move без lock успешно переносит файл/папку.
- Нет 5xx/panic/database locked в smoke.

## План тестирования

- `go test ./...`
- `npm test` если трогается frontend
- `npm run build` если трогается frontend
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: `MovePath` перед rename проверяет lock исходного файла или active descendant locks для папки.
- Реализовано: active lock блокирует move даже для владельца lock, чтобы не переносить runtime lock state неявно.
- Реализовано: git enqueue остаётся после успешного filesystem rename и не вызывается при `423 Locked`.
- Frontend не менялся: API уже возвращает `423 Locked`, а текущая UI-ошибка move отображается через существующий error path.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.

## Откат

Откатить изменения server lock/git policy и связанные тесты. Данные vault/DB не удалять.
