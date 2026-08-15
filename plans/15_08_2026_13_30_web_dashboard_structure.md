# Web Dashboard Structure Plan

Task: [15_08_2026_13_30_web_dashboard_structure.md](../tasks/15_08_2026_13_30_web_dashboard_structure.md)

## Последовательность реализации

1. Создать `web/src/api` и вынести общий JSON helper.
2. Добавить API-модули под auth, vaults, admin и git.
3. Создать layout components.
4. Вынести auth page.
5. Вынести dashboard page и vault components.
6. Добавить placeholder pages для vault detail, admin users и account.
7. Обновить `App.jsx` под новую структуру.
8. Прогнать frontend checks.

## Проверки

- `npm test`
- `npm run build`

## Риски

- При разделении файлов легко сломать текущий auth/vault flow.
- Без router URL пока не отражает выбранную страницу; это осознанно для каркаса.

## Заметки по откату

- Откатить commit, вернув монолитный `App.jsx`.
