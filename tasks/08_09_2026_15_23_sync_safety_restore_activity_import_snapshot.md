# Sync safety: restore, activity, import, snapshot

Status: IN WORK
Created: 2026-09-08 15:23
Project: mdock
Plan: [08_09_2026_15_23_sync_safety_restore_activity_import_snapshot.md](../plans/08_09_2026_15_23_sync_safety_restore_activity_import_snapshot.md)

## Проблема

Пользователь подключает к vault (Obsidian + Remotely Save) телефон с уже существующими заметками. Remotely Save на клиенте решает конфликты файлов сам (`overwrite=true`, keep newer/larger), а mdock — только dumb-хранилище + git-история. В результате:

- перезапись или удаление при синке «прячется» в git-истории, но UI не даёт восстановить файл;
- не видно, что именно сделал синк (какие файлы добавлены/перезатёрты/удалены);
- нет штатного способа импортировать заметки с телефона с понятной политикой при конфликтах имён;
- нет простой точки отката «до первого синка».

## Доказательства

- `tasks/14_08_2026_19_17_remote_git_backup.md:25` — Git merge conflict UI в later;
- `tasks/12_08_2026_20_05_webdav_mvp.md:24` — conflict branches для WebDAV в MVP не добавляем;
- `tasks/23_08_2026_15_57_git_history_ui.md:20,68` — restore из коммита в этой задаче не реализовывали (disabled/later в `CommitList.jsx`);
- `docs/roadmap.md:68-69` — «Позже: restore file from commit»;
- `docs/git-vaults.md:21-65` — git-модель: одно хранилище = один repo, commit messages, queue;
- `web/src/features/git/CommitList.jsx:61-63` — кнопка «Восстановить файл» disabled;
- `docs/remotely-save-webdav-compatibility.md:69` — conflictAction решается на клиенте, server-side merge UI не нужен.

## Нефункциональные ограничения

- Restore — только файл из коммита, новым коммитом (история не переписывается, `reset --hard` не используем).
- Не добавлять conflict branches и server-side merge для WebDAV.
- Не вводить новые зависимости и фреймворки.
- Не менять WebDAV/file mutation behavior и git-модель (`sync(source): update N files`).
- Все новые user-facing строки — в оба языка (ru/en) одним изменением.
- Хэши валидируются как hex prefix/full (без option-инъекции в git).
- Пути проходят существующие vault-safe resolvers (`SafeRelPath`, запрет `.git` и traversal).
- Снимок — лёгкий git-тег `pre-sync-<timestamp>`; тег не является веткой и не влияет на sync.
- Изменения ограничиваются backend, web UI, тестами и документацией (docs/server-api.md, задачи/планы).

## Не входит в задачу

- Restore всего vault из коммита/тега (только файл).
- Server-side merge/conflict UI.
- Автосинхронизация или auto-push.
- CRDT/live collaboration.
- Восстановление из удалённого репозитория.

## Желаемое поведение

1. Restore: в деталях коммита у каждого changed file есть действие «Восстановить файл» → содержимое файла возвращается из выбранного коммита и создаётся новый коммит (`sync(web): update 1 file`). Remotely Save увидит обычное обновление.
2. Активность: отдельный таб в интерфейсе хранилища со списком коммитов, сгруппированных по дням; выбор коммита показывает changed files и diff (как в существующей истории).
3. Импорт: кнопка импорта файлов/папки в текущую папку хранилища; при конфликте имён показывается диалог: перезаписать / переименовать / пропустить; импорт идёт через существующий content API, создавая обычные коммиты.
4. Снимок: кнопка в git-панели «Создать снимок» создаёт git-тег `pre-sync-<timestamp>` на текущем состоянии vault (после flush очереди); список существующих снимков показывается.

## Затронутые области

- `internal/git/git.go` — `RestoreFile`, `CreateTag`, `Tags`;
- `internal/app/service.go` — `RestoreFileFromCommit`, `CreateSnapshot`, `SnapshotTags`, новая ошибка;
- `internal/httpapi/git.go` — handlers restore/snapshot;
- `internal/httpapi/router.go` — маршруты `POST .../git/restore`, `POST .../git/snapshot`, `GET .../git/snapshots`;
- `internal/git/git_test.go`, `internal/server/server_test.go` — тесты;
- `docs/server-api.md` — документация API;
- `web/src/api/git.js` — helper-ы;
- `web/src/features/git/CommitList.jsx` — restore action per file, группировка по дням;
- `web/src/features/git/SnapshotPanel.jsx` — новый компонент;
- `web/src/pages/VaultPage.jsx` — таб «Активность», SnapshotPanel в настройках;
- `web/src/features/files/VaultFilesPanel.jsx` — импорт;
- `web/src/features/files/ImportDialog.jsx` — новый компонент;
- `web/src/features/i18n/LanguageProvider.jsx` — ru/en;
- `web/src/styles.css` — минимальные стили;
- `web/src/App.test.jsx` — тесты фронта.

## Заметки по реализации

- Restore через `git checkout <hash> -- <path>` внутри file-mutation lock + `enqueueVaultChange` (новый коммит, source `web`).
- Снимок: `git tag pre-sync-<unixnanos>` после `queue.Flush(ctx)`, чтобы тег включал незакоммиченные изменения.
- Список снимков: `git tag --list "pre-sync-*" --sort=-creatordate`.
- Активность: переиспользуем `CommitList` с пропсом `groupByDay` и большим limit коммитов (200).
- Импорт: `<input type="file" multiple webkitdirectory>` + `file.webkitRelativePath`; для конфликтов диалог с одним policy (перезаписать/переименовать/пропустить), применяется ко всем конфликтующим; бинарные файлы пропускаем.

## Критерии приёмки

- API restore покрыт server test: неизвестный hex → 400, валидный → файл восстановлен и создан новый коммит; рабочее дерево чистое после flush.
- API snapshot: создаёт тег, возвращает имя; `GET snapshots` его показывает.
- `go test ./...` проходит, `go build -mod=vendor -buildvcs=false ./cmd/mdock` проходит.
- Frontend: restore-кнопка в ChangedFile, таб «Активность», диалог импорта, SnapshotPanel рендерятся; `npm test` и `npm run build` проходят.
- no regressions: существующие рукописи и тесты не ломаются.

## План тестирования

- `go test ./...`
- `go build -mod=vendor -buildvcs=false ./cmd/mdock`
- `cd web && npm test`
- `cd web && npm run build`
- Ручная проверка после пересборки test-контейнера: restore, snapshot, импорт с конфликтом, таб «Активность».

## Результаты валидации

- Заполняется после прогона проверок.

## Откат

- Убрать маршруты restore/snapshot и связанные методы git client/service.
- Вернуть CommitList/VaultPage/VaultFilesPanel к прежнему виду.
- Откат не требует миграций и не меняет storage/git-модель.