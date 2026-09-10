# Basic Web Dashboard Plan

Task: [14_08_2026_21_15_basic_web_dashboard.md](../tasks/14_08_2026_21_15_basic_web_dashboard.md)

## Последовательность реализации

1. Инвентаризировать текущий `web/src` и API contract из `docs/server-api.md`.
2. Сделать единый frontend API client:
   - JSON request helper;
   - CSRF header из cookie;
   - нормализация ошибок.
3. Добавить глобальную theme-систему:
   - CSS variables;
   - `black`, `dark`, `warm`, `light`;
   - accent colors violet, blue, cyan, green, amber, rose;
   - `localStorage`;
   - controls в topbar/account.
4. Реализовать auth shell:
   - setup first admin;
   - login;
   - logout;
   - current user state.
5. Реализовать vault dashboard:
   - list/create;
   - detail;
   - rename;
   - archive/unarchive;
   - WebDAV details.
6. Реализовать git section vault detail:
   - status;
   - commits;
   - remote get/set;
   - manual push.
7. Реализовать admin users panel:
   - list/create;
   - enable/disable;
   - password reset;
   - revoke sessions.
8. Добавить frontend tests на ключевые API states, error states и theme persistence.
9. Проверить production build и test stack.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- Ручной/e2e браузерный проход через test stack.

## Риски

- На сервере пока нет JSON file tree API; поэтому не надо обещать markdown-файловое дерево в рамках этой задачи.
- Setup-регистрация доступна только в пустой БД; test/e2e должен уметь работать с чистым volume или отдельным temporary stack.
- CSRF легко забыть на `PUT/PATCH/POST`; helper должен закрыть это централизованно.
- Риск контрастности на `black`/`warm` темах; цвета текста должны идти из theme tokens, а не из компонентных override.

## Заметки по откату

- UI задача не меняет серверный state contract; откат через revert commit.
