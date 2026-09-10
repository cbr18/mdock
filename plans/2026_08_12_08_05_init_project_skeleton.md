# Инициализация скелета проекта

Task: [12_08_2026_08_05_init_project_skeleton.md](../tasks/12_08_2026_08_05_init_project_skeleton.md)

## Последовательность реализации

1. Зафиксировать финальные init-решения перед кодом:
   - Go module name;
   - имя бинарника;
   - точные env names;
   - production/test ports;
   - CSS-подход.
2. Создать Go module и базовую структуру backend:
   - `cmd/mdock`;
   - config loading из env;
   - structured logging через `slog`;
   - HTTP router;
   - health endpoint;
   - static frontend embedding через `embed.FS`.
3. Добавить SQLite foundation:
   - data-dir initialization;
   - schema migrations/bootstrap на старте;
   - WAL mode;
   - users table;
   - sessions table;
   - file locks table.
4. Добавить минимальную auth foundation:
   - bootstrap user из env при первом запуске;
   - password hashing через bcrypt;
   - login endpoint;
   - session cookie;
   - protected test endpoint для проверки session middleware.
5. Добавить skeleton-пакеты под будущие слои:
   - path safety;
   - vault filesystem access;
   - git command runner/queue interface;
   - locks service;
   - WebDAV handler placeholder.
6. Создать React/Vite frontend в `web/`:
   - минимальный app shell;
   - login form;
   - health/API smoke view;
   - Vite proxy на backend для dev;
   - production build output, совместимый с Go embed.
7. Добавить production build path:
   - frontend build;
   - Go embed static files;
   - fallback на frontend `index.html` для SPA routes;
   - graceful behavior, если static assets ещё не собраны в dev.
8. Добавить Dockerfile:
   - multi-stage build;
   - frontend build stage;
   - Go build stage;
   - runtime image с `git` binary;
   - volumes для `/vaults` и `/data`.
9. Добавить root `docker-compose.yml` для production:
   - один service приложения;
   - env из `.env`;
   - mount `/vaults`;
   - mount `/data`;
   - healthcheck;
   - production named volumes.
10. Добавить `./test/docker-compose.yml` для dev/test stack:
    - отдельный service/build context;
    - отдельные test volumes;
    - отдельный published port;
    - env из `test/.env.test.example`;
    - healthcheck;
    - project/data isolation от production stack.
11. Добавить тестовую инфраструктуру:
    - Go unit tests для config, SQLite init, auth, path safety;
    - frontend tests для базового app/login;
    - integration/smoke tests против поднятого `./test` stack;
    - скрипт или make target для запуска smoke tests без управления Docker lifecycle.
12. Обновить документацию:
    - README с dev/prod/test командами;
    - docs с описанием env;
    - task-файл с результатами реализации и validation results.

## Проверки

- `go test ./...`
- `go build -buildvcs=false ./cmd/mdock`
- `cd web && npm test`
- `cd web && npm run build`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- После реализации и отдельного разрешения на запуск Docker:
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
  - дождаться healthcheck;
  - запустить smoke/integration тесты против test stack;
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down`

## Риски

- `modernc.org/sqlite` может увеличить время сборки и размер бинарника, но сохраняет сборку без CGO.
- Vite/React зависимости создадут lockfile; это допустимо только как часть инициализации frontend-проекта.
- Go embed требует, чтобы production static assets существовали на момент build; dev режим должен не ломаться без frontend build.
- Test compose должен быть изолирован от production volumes, иначе можно случайно смешать данные.
- WebDAV MVP реализуется ручным handler на `net/http`; при расширении совместимости всё равно нужна аккуратная обёртка filesystem для lock/path-safety поведения.
- Docker runtime image должен содержать системный `git`, иначе git-слой не заработает в production.
- Bootstrap password через env удобен для первого запуска, но его нельзя логировать и нельзя перезаписывать существующего пользователя при рестартах.

## Заметки по откату

Откат init-итерации — удалить добавленный скелет, Dockerfile, compose-файлы, frontend-проект и тестовую инфраструктуру. Не удалять Docker volumes и локальные vault/data директории без отдельного явного запроса.
