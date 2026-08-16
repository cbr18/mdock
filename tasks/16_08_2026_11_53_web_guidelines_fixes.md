# Web guidelines fixes

Status: DONE
Created: 2026-08-16 11:53
Project: mdock
Plan: [16_08_2026_11_53_web_guidelines_fixes.md](../plans/16_08_2026_11_53_web_guidelines_fixes.md)

## Проблема

Аудит UI по Web Interface Guidelines нашёл нарушения в навигации, формах, i18n, URL-state, форматировании чисел и базовой доступности.

## Доказательства

- Навигация использует `<button>` вместо ссылок.
- Stateful вкладки vault/editor не отражаются в URL.
- Архивирование выполняется без подтверждения.
- Часть input не имеет `name`, `autocomplete`, `spellCheck`.
- В UI есть `"..."`, hardcoded `Setup`, `yes/no` и ручное форматирование bytes.
- Нет skip link.

## Нефункциональные ограничения

- Не добавлять роутер.
- Сохранить текущий SPA history flow.
- Не менять backend API.
- Все новые user-facing строки добавить в RU/EN.

## Не входит в задачу

- Полная переработка роутинга.
- Дизайн-макеты.
- Реализация undo stack.

## Желаемое поведение

- Навигация остаётся SPA, но использует `<a href>` с поддержкой modifier-click.
- Вкладка vault и режим просмотра отражаются в query params.
- Архивирование требует подтверждения.
- Формы имеют корректные атрибуты.
- Числа/размеры форматируются через `Intl`.
- Loading text использует ellipsis `…`.
- Есть skip link к основному контенту.

## Затронутые области

- `web/src/App.jsx`
- `web/src/components/layout/`
- `web/src/features/`
- `web/src/pages/`
- `web/src/styles.css`
- `web/index.html`
- frontend tests

## Заметки по реализации

- Для ссылок использовать `href` + `onClick`, который перехватывает только обычный left click.
- Query params: `section=editor|settings`, `view=rendered|plain|split`.
- Для архива достаточно native confirm на MVP.

## Критерии приёмки

- Навигация работает как SPA и остаётся открываемой ссылкой.
- URL меняется при переключении vault section и view mode.
- Формы соответствуют базовым guidelines.
- Tests/build проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`

## Результаты валидации

- `npm test` в `web/` — passed, 8 tests.
- `npm run build` в `web/` — passed; Vite оставил информационное предупреждение о chunk > 500 kB.
- `go test ./...` — passed.

## Откат

Откатить frontend cleanup changes. Backend и данные не трогать.
