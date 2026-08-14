Status: CREATED

# Basic Web Dashboard

Plan: [14_08_2026_21_15_basic_web_dashboard.md](../plans/14_08_2026_21_15_basic_web_dashboard.md)

## Проблема

Серверные JSON API уже покрывают auth, users, vault management и git visibility, но веб-интерфейс пока не даёт полноценного рабочего экрана для управления этими возможностями.

## Доказательства

- API contract описан в `docs/server-api.md`.
- Текущий frontend минимальный и не использует все серверные ручки.
- Для следующего шага нужен UI, где можно пройти первый setup, войти, управлять пользователями/vault'ами и видеть git-состояние.

## Нефункциональные ограничения

- Не делать WebDAV UI: WebDAV остаётся отдельным endpoint для Obsidian.
- Не делать markdown editor/source preview в этой задаче.
- Не делать shared vault membership management, потому что это не готово на сервере.
- Не хранить пароли в frontend state дольше формы отправки.
- Все mutating API должны отправлять `X-CSRF-Token` из cookie `mdock_csrf`.
- UI должен быть пригоден для desktop и mobile без наложения текста/контролов.

## Не входит в задачу

- CodeMirror editor.
- Markdown preview.
- File JSON API, если его ещё нет на сервере.
- App-passwords.
- Shared vaults.
- WebDAV реализация и тесты.

## Желаемое поведение

- Экран setup первого admin, если `/api/auth/me` возвращает unauthorized и регистрация ещё возможна.
- Login/logout flow.
- Dashboard vault'ов:
  - список vault'ов;
  - создание vault;
  - переименование;
  - archive/unarchive через detail view;
  - WebDAV URL копируется/показывается как строка подключения.
- Git видимость:
  - dirty state;
  - queue length;
  - last queue error;
  - последние commits;
  - remote URL;
  - настройка/очистка remote;
  - manual push.
- Admin panel:
  - список пользователей;
  - создание пользователя;
  - enable/disable;
  - reset password;
  - revoke sessions;
  - обработка `last_active_admin`.
- Ошибки API показываются пользователю через UI state, без падения render path.

## Затронутые области

- `web/src`
- `web/package.json`, если тестовая конфигурация потребует уточнения
- `README.md` и docs, если изменится пользовательский flow

## Заметки по реализации

- Сверяться с `docs/server-api.md`.
- Делать один API client/helper для JSON запросов, cookie auth и CSRF.
- Не добавлять state management library без необходимости; для MVP достаточно React state/hooks.
- Для git commits использовать компактный список, для git status — отдельный блок внутри vault detail.
- Дерево git/commit history в формулировке этой задачи означает видимость git-состояния и истории vault; файловое дерево markdown появится отдельной задачей вместе с file API/editor.

## Критерии приёмки

- Пользователь может пройти setup первого admin на пустой БД.
- Пользователь может войти и выйти.
- Admin может создать пользователя.
- Пользователь может создать vault и увидеть WebDAV URL.
- Owner может увидеть git status/commits/remote, настроить remote и запустить push.
- Admin operations работают через UI и корректно показывают ошибки.
- Frontend tests покрывают ключевые states.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- Ручной/e2e проход в браузере через test stack:
  - setup/login;
  - vault create/rename/archive;
  - git status/commits;
  - admin create/disable/enable/reset/revoke.

## Результаты валидации

- Не выполнялось: задача только подготовлена.

## Откат

- Откатить commit задачи.

## Commits

- Будет заполнено после реализации.
