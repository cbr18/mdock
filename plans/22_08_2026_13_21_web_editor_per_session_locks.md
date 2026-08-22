# Web editor per-session locks

Task: [22_08_2026_13_21_web_editor_per_session_locks.md](../tasks/22_08_2026_13_21_web_editor_per_session_locks.md)

## Последовательность реализации

1. Расширить frontend files API: `owner` для acquire/heartbeat/write/release.
2. Генерировать owner token в `createFileEditorSession`.
3. Передавать owner token во все операции editor session.
4. Расширить HTTP request structs и `webLockOwner`: client owner token хэшируется с user id, fallback остаётся session cookie.
5. Добавить server test на два owner token в одной web session.
6. Обновить frontend tests.
7. Прогнать проверки и test stack.

## Проверки

- `npm test` — успешно, 26 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium/API проверка: `lockA=200`, `lockB=423`, `writeB=423`, `writeA=200`.

## Риски

- DELETE с owner query param должен не ломать старый release без owner.
- Если вкладка закрылась без release, новый owner сможет редактировать только после TTL.
- Browser duplicate tab может скопировать sessionStorage, поэтому owner лучше генерировать на editor session, а не хранить общий token в localStorage.

## Заметки по откату

Откатить frontend owner token, backend owner parsing и тесты. БД-миграции не нужны.
