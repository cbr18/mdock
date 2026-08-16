# Web navigation, archive и i18n

Status: DONE
Created: 2026-08-15 22:24
Project: mdock
Plan: [15_08_2026_22_24_web_navigation_archive_i18n.md](../plans/15_08_2026_22_24_web_navigation_archive_i18n.md)

## Проблема

Веб-морда не поддерживает browser back/forward, архивированные vaults исчезают из dashboard без понятного способа восстановления, а текст интерфейса смешивает русский и английский.

## Доказательства

- Навигация хранится только в React state и не синхронизируется с URL/history.
- `GET /api/vaults` отдаёт только неархивные vaults.
- Компоненты содержат hardcoded строки на двух языках.

## Нефункциональные ограничения

- Не ломать текущие API flows и WebDAV.
- Не добавлять тяжёлую i18n-библиотеку для MVP.
- Язык должен переключаться глобально рядом с темой и сохраняться в `localStorage`.
- UI должен оставаться responsive и не давать горизонтальный overflow.

## Не входит в задачу

- Роутинг через отдельный framework.
- Backend user preferences для языка.
- Shared vault permissions.
- Web editor/viewer.

## Желаемое поведение

- Browser back/forward работает для dashboard, account, users и vault pages.
- В UI есть понятный переход к архиву и обратно.
- Archived vault можно открыть и вернуть из архива.
- Все видимые строки текущего UI переключаются между `ru` и `en`.
- Переключатель языка находится рядом с настройками темы.

## Затронутые области

- `internal/store/`
- `internal/app/`
- `internal/httpapi/`
- `web/src/`
- `docs/server-api.md`
- tests/smoke

## Заметки по реализации

- Для history использовать query/hash route без React Router: `/ ?page=...` или hash-based state.
- Для архива добавить параметр list vaults: `archived=only|include`.
- Для i18n сделать лёгкий `LanguageProvider` и словарь ключей.
- Breadcrumb/back button добавить под topbar/PageHeader.

## Критерии приёмки

- Browser back возвращает с vault page на dashboard.
- Dashboard показывает active/archive modes.
- Archived vault виден в archive mode и может быть unarchive.
- Language switch меняет строки на RU/EN и сохраняется.
- Tests и smoke проходят.

## План тестирования

- `go test ./...`
- `npm test`
- `npm run build` из `web/`
- Docker rebuild test stack
- `./test/run-smoke.sh`
- Playwright UI smoke с browser back, archive mode и language switch.

## Результаты валидации

- `go test ./...` — passed.
- `npm test` в `web/` — passed, 8 tests.
- `npm run build` в `web/` — passed, есть warning Vite по chunk > 500 KB из-за markdown/highlight зависимостей.

## Откат

Откатить backend archived-list filter и frontend navigation/i18n changes. Данные vault не удалять.
