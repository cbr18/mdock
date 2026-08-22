# File deeplinks and new tab navigation

Status: DONE
Created: 2026-08-22 12:20
Project: mdock
Plan: [22_08_2026_12_20_file_deeplinks_new_tab.md](../plans/22_08_2026_12_20_file_deeplinks_new_tab.md)
Commits:
- `574e6a8` — `feat: add file deep links`

## Проблема

Файлы в дереве хранилища открываются через button/onClick, поэтому браузер не может открыть файл в новой вкладке стандартными способами: middle click, Ctrl/Cmd+click, context menu.

## Доказательства

- Пользователь спросил: "а как сделать чтобы можно было открыть в новой вкладке?"
- В `VaultFilesPanel` файловая строка сейчас использует `button.file-row-open`, а выбранный файл хранится только во frontend state.
- URL страницы хранилища уже хранит `page`, `slug`, `section`, `view`, но не хранит выбранный файл.

## Нефункциональные ограничения

- Не ломать текущее SPA-поведение обычного клика.
- Не менять backend API.
- Не трогать WebDAV.
- Не добавлять server drafts в MVP.
- Сохранять поддержку browser back/forward.
- Не менять test stack port или команды запуска.

## Не входит в задачу

- Server-side drafts как в Confluence.
- Auto-save draft.
- Publish/discard workflow.
- Conflict UI между draft и изменениями из Obsidian/WebDAV.
- Изменение Markdown editor behavior.

## Желаемое поведение

- У файла есть стабильный URL вида `/?page=vault&slug=<slug>&section=editor&file=<path>&view=<mode>`.
- Обычный клик по файлу открывает файл в текущей вкладке через SPA-навигацию.
- Ctrl/Cmd+click, middle click и browser context menu работают как обычная ссылка и открывают новую вкладку.
- При прямом открытии URL с `file=` приложение загружает дерево, раскрывает родителей и открывает файл.
- Browser back/forward восстанавливает выбранный файл и режим просмотра из URL.
- Решение по Confluence-like drafts зафиксировано: не MVP, вместо этого использовать dirty-state confirm и Git history; позже можно добавить localStorage crash recovery.

## Затронутые области

- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/App.test.jsx`
- `tasks/`
- `plans/`

## Заметки по реализации

- Для файлов использовать настоящий `<a href>`, для папок оставить button toggle.
- Для обычного клика по file link вызывать `preventDefault`, обновлять `file` query param и вызывать `openFile`.
- Для modified click/native navigation не перехватывать событие.
- При открытии `file=` подгрузить parent directories последовательно.
- Если файл удалён или не найден, не падать и показать существующую ошибку загрузки.

## Критерии приёмки

- В тесте файл отображается как link с корректным `href`.
- Обычный click по link открывает preview без page reload.
- URL получает `file=note.md`.
- Deep link на `folder/child.md` открывает файл после загрузки родителей.
- Browser back/forward синхронизирует выбранный файл.
- Drafts не реализованы в коде.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: файлы в дереве отображаются как настоящие ссылки с `href`.
- Реализовано: обычный click открывает файл через SPA, Ctrl/Cmd/middle click и context menu остаются native browser behavior.
- Реализовано: URL получает `file=<path>` и сохраняет `view`.
- Реализовано: прямой URL с вложенным `file=folder/child.md` раскрывает parent directory и открывает preview.
- Реализовано: `popstate` синхронизирует выбранный файл и режим просмотра.
- Решение по Confluence-like drafts зафиксировано: не MVP, server drafts не реализуются в этой задаче.
- `npm test` — успешно.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.

## Откат

Откатить изменения frontend file navigation и связанные тесты. Данные хранилищ не менять.
