Status: DONE

# Web Dashboard Structure

Plan: [15_08_2026_13_30_web_dashboard_structure.md](../plans/15_08_2026_13_30_web_dashboard_structure.md)

## Проблема

Перед полной реализацией web dashboard нужно разложить текущий монолитный `App.jsx` на структуру страниц, API-клиентов и компонентов.

## Доказательства

- Сейчас `web/src/App.jsx` содержит API helper, auth form, layout, vault list и vault card в одном файле.
- Следующая задача должна использовать все JSON API сервера, поэтому без структуры файл быстро станет нечитаемым.

## Нефункциональные ограничения

- Не добавлять новый frontend framework/router/state manager.
- Оставить текущий стек React + Vite.
- Не реализовывать WebDAV UI.
- Не менять серверный API.
- Сохранить текущие тесты и базовое поведение.

## Не входит в задачу

- Полная реализация всех API ручек.
- Markdown editor.
- File tree API.
- Реальный routing через URL.

## Желаемое поведение

- `App.jsx` отвечает за bootstrapping/session state и выбор страницы.
- API helper вынесен в `web/src/api`.
- Auth UI вынесен в page/feature компоненты.
- Dashboard layout, vault list и vault card вынесены в отдельные компоненты.
- Заготовлены страницы для vault detail, admin users и account.
- Текущие тесты проходят.

## Затронутые области

- `web/src`
- `tasks`
- `plans`

## Заметки по реализации

- Использовать именованные API-модули: auth, vaults, admin, git.
- Использовать простой `page` state вместо router dependency.
- Не создавать декоративный landing page.

## Критерии приёмки

- Frontend сохраняет login и vault WebDAV URL flow.
- `npm test` проходит.
- `npm run build` проходит.

## План тестирования

- `npm test`
- `npm run build`

## Результаты валидации

- `npm test` — пройдено.
- `npm run build` — пройдено.

## Откат

- Откатить commit задачи.

## Commits

- `10ad272` — Structure web dashboard frontend.
