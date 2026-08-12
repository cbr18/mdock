# Vault model, storage и git layer

Status: DONE
Created: 2026-08-12 19:35
Project: mdock
Plan: [12_08_2026_19_35_vault_model_storage_git_layer.md](../plans/12_08_2026_19_35_vault_model_storage_git_layer.md)

## Проблема

После init-скелета проект умеет стартовать, создавать bootstrap user, хранить сессии и отвечать на health/auth endpoints, но core-модель vault ещё не соответствует принятой архитектуре.

Нужно отделить `vault` от `user`, перейти от single-vault config к `VAULTS_ROOT`, добавить SQLite-модель `vaults`/`vault_members`, реализовать безопасные файловые операции внутри конкретного vault и начать полноценный git layer: один vault = одна папка = один git repo = одна git queue.

## Доказательства

- [docs/vault-server-tz.md](../docs/vault-server-tz.md) фиксирует слоистую архитектуру и модель `users` / `vaults` / `vault_members`.
- [docs/tech-stack.md](../docs/tech-stack.md) фиксирует `VAULTS_ROOT`, отдельный git repo на vault и per-vault git queue.
- Текущий init-скелет всё ещё использует single-vault config и не создаёт personal vault при bootstrap user.
- Текущий `internal/git` — только placeholder queue без реального git CLI adapter.
- Текущий `internal/vault` содержит только базовую проверку relative path, но не умеет работать с vault entity и файлами.
- Текущий `internal/locks` — in-memory skeleton, а по архитектуре locks должны быть лёгкими и привязанными к `vault_id`.

## Нефункциональные ограничения

- Сохраняем слоистую архитектуру:
  - `store` отвечает за SQLite state;
  - `vault` отвечает за безопасную ФС внутри vault;
  - `git` отвечает только за git CLI и queue;
  - `locks` отвечает только за advisory locks;
  - `server`/`webdav` только связывают слои.
- Web-морду в этой задаче не развиваем.
- Shared vault UI, sharing management и CRDT не входят в задачу.
- WebDAV полноценную реализацию не делаем, но решения не должны ломать будущую WebDAV-интеграцию.
- Локи должны быть минимальными и лёгкими:
  - не блокируют чтение;
  - не блокируют весь vault;
  - не блокируют независимые файлы;
  - не блокируют git queue;
  - только file-level advisory lock на время активного edit/write.
- Git operations должны быть последовательными внутри одного vault/repo.
- Разные vaults не должны блокировать git operations друг друга.
- Не добавлять git remote sync/backup.
- Не добавлять новые тяжёлые фреймворки или сервисы.
- Не хранить секреты в репозитории и не логировать пароли/session/auth headers.
- Docker production и test stacks должны остаться рабочими.

## Не входит в задачу

- Полная web UI/file browser/editor реализация.
- Полная WebDAV filesystem wrapper реализация.
- fsnotify watcher для external changes.
- Git remote push/pull/sync.
- Shared vault creation UI.
- Управление участниками vault через UI/API.
- CRDT/Yjs/live co-editing.
- App-passwords для WebDAV.
- Nginx/TLS/reverse proxy настройка.
- Удаление существующих Docker volumes.

## Желаемое поведение

После задачи backend должен иметь рабочий core storage/git foundation:

- Конфигурация использует `VAULTS_ROOT`, а не single-vault path.
- Docker монтирует root vaults directory в `/vaults`.
- SQLite содержит:
  - `users`;
  - `vaults`;
  - `vault_members`;
  - `sessions`;
  - `file_locks` с привязкой к `vault_id`.
- Bootstrap user при первом запуске получает personal vault:
  - vault kind: `personal`;
  - stable slug;
  - path внутри `VAULTS_ROOT`;
  - membership role: `owner`.
- Каждый vault инициализируется как отдельный git repository.
- Git repository каждого vault работает на ветке `main`.
- При dirty state на старте для каждого vault выполняется recovery commit.
- `internal/vault` умеет безопасно выполнять базовые file operations внутри vault.
- `internal/git` умеет выполнять реальные git операции через системный `git`.
- Git queue работает per-vault и последовательно коммитит изменения с debounce grouping.
- Locks реализованы через SQLite и остаются лёгкими advisory locks.
- Есть минимальные backend/API или service-level проверки, позволяющие тестировать:
  - список vaults текущего пользователя;
  - bootstrap personal vault;
  - git repo initialization;
  - safe file write + queued commit.

## Затронутые области

- `internal/config/`
- `internal/store/`
- `internal/vault/`
- `internal/git/`
- `internal/locks/`
- `internal/server/`
- `cmd/mdock/`
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `test/docker-compose.yml`
- `test/.env.test.example`
- `test/smoke/`
- `README.md`
- `docs/`
- `tasks/`
- `plans/`

## Заметки по реализации

- Env:
  - использовать `VAULTS_ROOT`;
  - default для Docker: `/vaults`;
  - data-dir остаётся `/data`.
- Physical vault path:
  - использовать stable vault slug или generated id;
  - путь должен быть внутри `VAULTS_ROOT`;
  - нельзя строить path напрямую из непроверенного пользовательского ввода.
- SQLite schema:
  - так как проект новый, можно обновить bootstrap schema напрямую без migrations framework;
  - schema init должна быть идемпотентной;
  - WAL mode сохраняем.
- Bootstrap:
  - если users отсутствуют, создать bootstrap user;
  - если у bootstrap user нет personal vault, создать его;
  - повторный старт не должен перезаписывать password и не должен создавать дубликаты vault.
- Git:
  - использовать только системный `git` через `os/exec`;
  - все команды запускать с `Dir` = vault path;
  - sanitize command args, не использовать shell;
  - no-op commit, если изменений нет;
  - recovery commit message: `recovery: commit dirty startup state`;
  - regular commit messages можно начать с `sync: update N files`.
- Git queue:
  - одна queue на vault id;
  - debounce window из `COMMIT_DEBOUNCE`;
  - группировать paths в один commit на debounce window;
  - разные vault queues могут работать независимо.
- Vault file operations:
  - запрет `.git`;
  - запрет absolute paths;
  - запрет `..` traversal;
  - защита от symlink escape;
  - базовые операции: list, read, write, mkdir, rename, delete.
- Locks:
  - owner должен быть `editor_id` или operation id, а не только `session_id`;
  - lock conflict проверяется по `vault_id + path`;
  - expired locks чистятся при acquire/heartbeat;
  - read operations lock не требуют.

## Критерии приёмки

- Single-vault path config больше не используется в коде/config/compose/docs для текущей архитектуры.
- `VAULTS_ROOT` используется в config, Docker и test env.
- Bootstrap user получает ровно один personal vault при повторных стартах.
- Personal vault создаётся как папка внутри `VAULTS_ROOT`.
- Personal vault инициализируется как git repo на `main`.
- Dirty personal vault получает recovery commit при старте.
- Vault file operations не позволяют выйти за пределы vault и не позволяют доступ к `.git`.
- SQLite `vaults` и `vault_members` покрыты тестами.
- Locks привязаны к `vault_id`, не блокируют разные файлы и истекают по TTL.
- Per-vault git queue покрыта тестами.
- Production Docker stack собирается и проходит health/auth/personal-vault smoke check.
- Test Docker stack собирается и `./test/run-smoke.sh` проходит.
- Документация и env examples соответствуют `VAULTS_ROOT`.

## План тестирования

- `go test ./...`
- `go build -mod=vendor -buildvcs=false -o /tmp/mdock ./cmd/mdock`
- `cd web && npm test`
- `cd web && npm run build`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- Production stack manual validation:
  - `docker compose up -d --build`;
  - health endpoint;
  - login bootstrap user;
  - protected endpoint;
  - personal vault endpoint/smoke;
  - `docker compose down`.
- Test stack validation:
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`;
  - `./test/run-smoke.sh`;
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down`.

## Результаты валидации

- `env GOCACHE=/tmp/go-cache go test ./...` — успешно.
- `env GOCACHE=/tmp/go-cache go build -mod=vendor -buildvcs=false -o /tmp/mdock ./cmd/mdock` — успешно.
- `cd web && npm test` — успешно.
- `cd web && npm run build` — успешно.
- `docker compose config` — успешно, production stack использует `VAULTS_ROOT=/vaults` и volume `/vaults`.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` — успешно, test stack использует `VAULTS_ROOT=/vaults` и порт `18080`.
- Production stack:
  - `docker compose up -d --build` — успешно;
  - `GET /healthz` — `{"status":"ok"}`;
  - `POST /api/auth/login` для bootstrap user — `{"status":"ok","username":"admin"}`;
  - `GET /api/vaults` — вернул один personal vault `admin` с role `owner`;
  - `git -C /vaults/admin status --porcelain` внутри контейнера — пустой вывод;
  - `docker compose down` — stack остановлен.
- Test stack:
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — успешно;
  - `GET /healthz` на `127.0.0.1:18080` — `{"status":"ok"}`;
  - `./test/run-smoke.sh` — успешно;
  - `git -C /vaults/admin status --porcelain` внутри test container — пустой вывод;
  - `docker compose --env-file test/.env.test.example -f test/docker-compose.yml down` — stack остановлен.

## Откат

Откатить изменения config/schema/vault/git/locks layers и вернуть init-состояние. Docker volumes и реальные vault директории не удалять без отдельного явного запроса.
