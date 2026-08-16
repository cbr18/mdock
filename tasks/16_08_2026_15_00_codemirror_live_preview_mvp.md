# CodeMirror Live Preview MVP

Status: DONE
Created: 2026-08-16 15:00
Project: mdock
Plan: [16_08_2026_15_00_codemirror_live_preview_mvp.md](../plans/16_08_2026_15_00_codemirror_live_preview_mvp.md)

## Проблема

Во вкладке `Просмотр` при включённом `Редактирование` сейчас показан placeholder вместо редактируемой live preview поверхности. Пользователю нужен Obsidian-like редактор: Markdown остаётся source of truth, но выглядит ближе к отрендеренному документу.

## Доказательства

- Пользователь попросил перейти к live editor.
- Предыдущая задача `Editable rendered mode` отклонена, потому что показывала plain editor/preview composition вместо live preview.
- Текущий `Просмотр + Редактирование` явно сообщает, что Live Preview ещё не реализован.

## Нефункциональные ограничения

- Не внедрять ProseMirror/TipTap/WYSIWYG framework.
- Не менять Markdown source при переключении режимов.
- Не реализовывать toolbar-команды форматирования в этой задаче.
- Использовать CodeMirror 6 decorations/widgets поверх существующего editor.
- Сохранять тему через CSS variables.
- Не ломать `Исходник` и `Две панели`.

## Не входит в задачу

- Tables WYSIWYG.
- Embeds/images/mermaid/backlinks.
- Кликабельные checkboxes.
- Wikilink navigation/autocomplete.
- Реализация команд toolbar `Абзац`, `Формат`, `Списки`, `Вставка`.

## Желаемое поведение

- `Просмотр + Редактирование` показывает editable CodeMirror live preview вместо placeholder.
- Заголовки, inline marks, lists/tasks, blockquote, inline code, fenced code и links получают visual styling.
- Markdown markers приглушены, но не удалены физически.
- `Исходник + Редактирование` остаётся plain source editor.
- `Две панели + Редактирование` остаётся source editor + rendered preview.
- Save работает через существующую кнопку рядом с `Редактирование`.

## Затронутые области

- `web/src/features/editor/MarkdownEditor.jsx`
- `web/src/features/editor/livePreviewExtension.js`
- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/styles.css`
- `web/src/App.test.jsx`

## Заметки по реализации

- Добавить prop `variant="source" | "live"` в `MarkdownEditor`.
- Для MVP использовать CodeMirror `MatchDecorator`/`Decoration` по visible ranges, чтобы не парсить весь документ тяжёлыми regex на каждый input.
- Line decorations применить для headings, blockquote, lists/tasks, fenced code.
- Mark decorations применить для inline bold/italic/strike/highlight/inline code/link markers.
- `Просмотр + edit on` должен передавать `variant="live"`.

## Критерии приёмки

- Placeholder Live Preview исчезает из `Просмотр + Редактирование`.
- В `Просмотр + Редактирование` есть `Markdown-редактор`.
- Live preview classes появляются на heading/list/blockquote/code/link markdown.
- `Исходник` не получает live preview классы.
- Tests/build/smoke проходят.
- Test stack пересобран на `http://127.0.0.1:18081`.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `./test/run-smoke.sh`
- `cd test && docker compose up -d --build`
- Playwright MCP ручная проверка `Просмотр + Редактирование`.

## Результаты валидации

- `npm test` — passed, 3 files / 22 tests.
- `npm run build` — passed.
- `go test ./...` — passed.
- `cd test && docker compose up -d --build` — passed, test stack rebuilt.
- `./test/run-smoke.sh` — passed.
- Playwright MCP manual check on `http://127.0.0.1:18081/?page=vault&slug=admin` — passed: `Просмотр + Редактирование` opens editable CodeMirror live preview instead of placeholder.
- Commit: `3960896`.

## Откат

Откатить `livePreviewExtension`, `variant` wiring, CSS live preview styles и тесты этой задачи.
