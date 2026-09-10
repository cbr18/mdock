# Web editor per-session locks

Status: DONE
Created: 2026-08-22 13:21
Project: mdock
Plan: [22_08_2026_13_21_web_editor_per_session_locks.md](../plans/22_08_2026_13_21_web_editor_per_session_locks.md)
Commits:
- `11c81ee` — `fix: use per-editor web lock owners`

## Проблема

Один файл можно открыть и начать редактировать в двух вкладках одного пользователя. Lock owner сейчас фактически привязан к web session cookie, поэтому две вкладки одной сессии считаются одним владельцем lock.

## Доказательства

- Пользователь проверил сценарий и сообщил: "нихуя так не работает".
- `web/src/api/files.js` не передаёт owner/token в lock/write requests.
- `internal/httpapi/files.go` строит owner через `webLockOwner(r, user.ID)`, завязанный на `mdock_session`.

## Нефункциональные ограничения

- Не ломать WebDAV locks.
- Не доверять client token напрямую: backend должен namespace/hash token вместе с user id.
- Не логировать lock token.
- Не менять общий auth/session flow.
- Сохранять fallback для старых запросов без owner token, где это безопасно.

## Не входит в задачу

- Presence UI.
- Список активных редакторов.
- Force unlock.
- Collaborative editing.

## Желаемое поведение

- Каждая вкладка/editor session получает отдельный lock owner token.
- Если вкладка A включила `Редактирование`, вкладка B на том же файле получает `423 Locked`.
- Вкладка A может heartbeat/save/release только со своим owner token.
- Backend хранит не сырой client token, а нормализованный owner вида `web:<userID>:<hash>`.
- Если owner token не передан, backend использует старый session-based fallback для совместимости.

## Затронутые области

- `web/src/features/editor/fileEditorSession.js`
- `web/src/features/editor/fileEditorSession.test.js`
- `web/src/api/files.js`
- `internal/httpapi/files.go`
- `internal/server/server_test.go`
- `tasks/`
- `plans/`

## Заметки по реализации

- Генерировать random owner token при создании editor session.
- Передавать owner token в acquire/heartbeat/save/release.
- Для DELETE release передавать owner token query-параметром.
- Backend принимает `owner` в lock/write JSON body и query для release.
- Backend хэширует owner token через sha256 вместе с user id.

## Критерии приёмки

- Server test: same user/session, owner A locks file, owner B получает `423`.
- Server test: owner A может write и release.
- Frontend session test: API calls получают owner token.
- `npm test` проходит.
- `npm run build` проходит.
- `go test ./...` проходит.
- Test stack пересобран стандартной командой.
- Smoke зелёный.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`

## Результаты валидации

- Реализовано: frontend editor session генерирует owner token и передаёт его в acquire/heartbeat/save/release.
- Реализовано: backend принимает `owner` для web editor lock/write requests и хэширует его вместе с user id.
- Реализовано: fallback на session-based owner сохранён для старых запросов без `owner`.
- Добавлен server test: same user/session, owner `tab-a` locks file, owner `tab-b` получает `423` на lock/write, owner `tab-a` может write/release.
- Добавлены frontend tests на передачу owner token.
- `npm test` — успешно, 26 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium/API проверка на test stack: `create=201`, `lockA=200`, `lockB=423`, `writeB=423`, `writeA=200`.

## Откат

Откатить изменения lock owner contract и тесты. Существующие locks переживут TTL.
