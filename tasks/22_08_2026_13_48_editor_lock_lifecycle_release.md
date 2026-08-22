# Editor lock lifecycle release

Status: DONE
Created: 2026-08-22 13:48
Project: mdock
Plan: [22_08_2026_13_48_editor_lock_lifecycle_release.md](../plans/22_08_2026_13_48_editor_lock_lifecycle_release.md)

## Проблема

Если вкладка с активным web editor lock закрывается, обновляется или браузер уходит в background/sleep, штатный `release` может не успеть уйти. Сейчас fallback — TTL и heartbeat, но пользователь может видеть файл заблокированным до истечения TTL.

## Доказательства

- Web editor lock теперь per-editor session, поэтому зависший lock от закрытой вкладки влияет на другие вкладки того же пользователя.
- `fileEditorSession.close()` вызывает обычный async release, но browser lifecycle не гарантирует завершение async request при unload.
- Пользователь согласовал доработку browser lifecycle.

## Нефункциональные ограничения

- Не ломать TTL fallback.
- Не обходить lock безопасность.
- Не добавлять сложный presence/collaboration слой.
- Не логировать owner token.
- Не менять WebDAV lock behavior.

## Не входит в задачу

- Force unlock UI.
- Список активных редакторов.
- Collaborative editing.
- Server drafts.

## Желаемое поведение

- При закрытии/перезагрузке вкладки web editor пытается освободить lock через lifecycle-safe mechanism.
- Если lifecycle release не сработал, heartbeat TTL остаётся fallback.
- При `pagehide`/`visibilitychange` не должно быть ложного release, если пользователь просто переключил вкладку и продолжает редактировать.
- При обычном выключении галки `Редактирование` release остаётся обычным API request.

## Затронутые области

- `web/src/features/editor/fileEditorSession.js`
- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/api/files.js`
- `internal/httpapi/files.go` при необходимости lightweight endpoint/body support
- `tasks/`
- `plans/`

## Заметки по реализации

- Рассмотреть `navigator.sendBeacon` на `pagehide` для release.
- Если `sendBeacon` неудобен из-за CSRF/DELETE, использовать `fetch(..., { keepalive: true })` с POST endpoint release или текущий DELETE, если browser поддержит.
- Нельзя делать release на обычный `visibilitychange:hidden`, иначе lock будет слетать при переключении вкладок.
- Release должен передавать per-editor owner token.

## Критерии приёмки

- При page close/reload отправляется lifecycle-safe release attempt.
- Обычный manual release продолжает работать.
- TTL fallback сохраняется.
- `npm test` проходит.
- `npm run build` проходит.
- `go test ./...` проходит.
- Test stack и smoke зелёные.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Headless browser: открыть файл, включить edit, закрыть вкладку, проверить что новая вкладка может взять lock без ожидания TTL.

## Результаты валидации

- Commit: `6b49fad`
- `npm test` — успешно, 5 файлов тестов, 28 тестов.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- `cd test && docker compose down -v` — успешно, test stack остановлен.
- `git diff --check` — успешно.
- Headless browser через доступный Playwright MCP открыть смог, но полноценный сценарий закрытия вкладки не автоматизирован: в текущем наборе MCP-инструментов нет `fill/type/evaluate`, поэтому невозможно залогиниться и включить редактирование через UI. Покрытие добавлено unit-тестами session lifecycle и keepalive API request.

## Откат

Откатить lifecycle release wiring. Существующие locks дождутся TTL.
