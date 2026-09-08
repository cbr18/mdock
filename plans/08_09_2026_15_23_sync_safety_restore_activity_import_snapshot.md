# Sync safety: restore, activity, import, snapshot

Task: [08_09_2026_15_23_sync_safety_restore_activity_import_snapshot.md](../tasks/08_09_2026_15_23_sync_safety_restore_activity_import_snapshot.md)

## Последовательность реализации

1. Backend git client: `RestoreFile(ctx, repo, hash, relPath)` через `git checkout <hash> -- <relPath>`; `CreateTag` (лёгкий тег, возвращаем имя); `Tags` — список тегов с префиксом `pre-sync-`. Валидация hex-hash внутри.
2. Backend service: `RestoreFileFromCommit` (fileMutationContext + withFileMutationLock + git checkout + enqueueVaultChange), `CreateSnapshot` (gitContext + queue.Flush + tag), `SnapshotTags`. Новая ошибка `ErrInvalidCommitHash`.
3. Backend HTTP: handlers restore (`POST /api/vaults/{slug}/git/restore`, body `{hash, path}`), snapshot (`POST /api/vaults/{slug}/git/snapshot`), snapshots (`GET /api/vaults/{slug}/git/snapshots`). Роуты в `router.go`.
4. Backend-тесты: в `git_test.go` (RestoreFile создаёт коммит с нужным содержимым; CreateTag/Tags) и в `server_test.go` (restore валидного/инвалидного hash, snapshot создаёт и листит).
5. Документация: `docs/server-api.md` — новые эндпоинты, убрать строку «Restore из коммита не входит в текущий API».
6. Frontend API: `web/src/api/git.js` — `restoreFile`, `createSnapshot`, `listSnapshots`.
7. `CommitList.jsx`: активная кнопка restore per changed file (с confirm и новым коммитом), группировка по дням через `groupByDay`.
8. `SnapshotPanel.jsx`: кнопка «Создать снимок» + список снимков; подключить в `VaultPage` settings.
9. VaultPage: таб «Активность» (`section=activity`), грузит коммиты limit 200 и рендерит CommitList с `groupByDay`.
10. Импорт: кнопка «Импорт» в pathbar, скрытый `<input type="file" multiple webkitdirectory>`, чтение `file.text()`, det-екция конфликтов через `listFiles`, диалог политики (`ImportDialog.jsx`: перезаписать/переименовать/пропустить), цикл createFile/writeFileContent, обновление дерева.
11. i18n ru/en + минимальные стили.
12. Прогнать `go test ./...`, `go build`, `npm test`, `npm run build`.
13. Вернуть stash WIP UI-правок в рабочее дерево; в коммиты попадают только изменения этой ветки.
14. Зафиксировать результат: статус задачи, commit hashes.

## Проверки

- `go test ./...`
- `go build -mod=vendor -buildvcs=false ./cmd/mdock`
- `cd web && npm test`
- `cd web && npm run build`
- `git status` чист относительно рабочего дерева; stash WIP не в коммитах.

## Риски

- Restore на файл, который удалён/изменён позже: `git checkout <hash> -- <path>` восстанавливает файл даже при его отсутствии в рабочем дереве; при отсутствии пути в коммите git вернёт ошибку → будет понятная 4xx.
- Импорт больших вложений: используем существующий content API (body limit учитывается сервером); большие/бинарные файлы пропустим с сообщением.
- `webkitdirectory` в мобильных браузерах может не поддерживаться; импорт останется путём выбора файлов.

## Заметки по откату

- Убрать 3 маршрута и связанные методы; вернуть UI-компоненты к исходным.
- Миграций нет, storage/git-модель не меняется.