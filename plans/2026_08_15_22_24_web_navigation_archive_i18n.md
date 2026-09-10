# Web navigation, archive и i18n

Task: [15_08_2026_22_24_web_navigation_archive_i18n.md](../tasks/15_08_2026_22_24_web_navigation_archive_i18n.md)

## Последовательность реализации

1. Добавить backend list vaults filter `archived=active|only|include`.
2. Синхронизировать frontend page state с browser history.
3. Добавить dashboard mode active/archive и карточки archived vaults.
4. Добавить лёгкий i18n provider, словари RU/EN и language switch рядом с темой.
5. Перевести текущие видимые строки UI на ключи.
6. Обновить docs/tests.
7. Прогнать unit/build/smoke/Playwright.

## Проверки

- `go test ./...`
- `npm test`
- `npm run build`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`

## Риски

- Ручной history routing может конфликтовать с static fallback.
- Полная i18n-замена может пропустить редкую строку.
- Archive mode не должен случайно включить WebDAV для archived vault.

## Заметки по откату

Откатить изменения frontend route/i18n и backend filter. SQLite данные не трогать.
