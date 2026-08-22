# Editor lock lifecycle release

Task: [22_08_2026_13_48_editor_lock_lifecycle_release.md](../tasks/22_08_2026_13_48_editor_lock_lifecycle_release.md)

## Последовательность реализации

1. Проанализировать текущий `fileEditorSession.close()` и API release.
2. Выбрать browser-safe release mechanism: `fetch keepalive` или `sendBeacon`.
3. Добавить lifecycle release только на `pagehide`/unload path, не на простое скрытие вкладки.
4. Передавать per-editor owner token.
5. Добавить tests для вызова lifecycle release.
6. Проверить headless browser scenario с закрытием вкладки.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Риски

- `sendBeacon` не даёт удобно читать response, поэтому это best-effort release.
- `keepalive` имеет ограничения размера body, release request должен быть маленьким.
- Нельзя release-ить lock при background tab, иначе пользователь потеряет lock во время обычной работы.

## Заметки по откату

Откатить frontend lifecycle handler и возможный backend endpoint. Locks не мигрируются.
