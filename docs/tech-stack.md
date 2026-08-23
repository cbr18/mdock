# Технический стек

## Цель

Зафиксировать библиотеки и инструменты для MVP self-hosted markdown vault server, чтобы перед стартом разработки не расползлись зависимости и архитектурные решения.

## Runtime

- **Go** — backend, WebDAV, API, auth, git worker, file watcher, embedded static frontend.
- **Node.js + npm** — только для разработки и сборки frontend.
- **SQLite** — runtime-state приложения: пользователи, сессии, vaults, vault memberships, file locks, будущие app-passwords/share metadata.
- **Git CLI** — локальная история каждого vault через системный `git`.

## Backend

### HTTP/API

- **Go standard library `net/http`**
  - Базовый HTTP server.
  - Middleware можно писать явно.
  - Для MVP не нужен тяжёлый web framework.

- **Router: `github.com/go-chi/chi/v5`**
  - Маленький idiomatic router поверх `net/http`.
  - Удобен для групп маршрутов: `/api/*`, `/auth/*`, `/webdav/*`.
  - Хорошо подходит для middleware auth/session/logging.

### WebDAV

- **Go standard library `net/http` + ручной WebDAV MVP handler**
  - Для MVP реализуем только нужные методы: `OPTIONS`, `PROPFIND`, `GET`, `HEAD`, `PUT`, `MKCOL`, `DELETE`, `MOVE`, `LOCK`, `UNLOCK`.
  - Основной compatibility target Фазы 1 — Obsidian plugin **Remotely Save**.
  - Handler должен проходить интеграционные проверки против поведения Remotely Save: `${vaultName}` subfolder, Unicode/space paths, CORS для Obsidian mobile origins, корректные `PROPFIND` href/properties, `ETag`, `Last-Modified`, WebDAV status codes и lock-token handling.
  - Аудит поведения Remotely Save хранится в [remotely-save-webdav-compatibility.md](remotely-save-webdav-compatibility.md).
  - Handler вызывает слои `store`, `vault`, `locks` и `git`, а не работает с файловой системой напрямую.
  - Все paths проходят через vault-safe resolver:
    - ограничение корнем vault;
    - запрет `.git`;
    - защита от path traversal;
    - защита от symlink escape.
  - `423 Locked` возвращается при записи в файл, залоченный другим owner.
  - Если позже понадобится WebDAV совместимость шире Remotely Save/Obsidian, можно отдельно оценить переход на `golang.org/x/net/webdav` или расширение текущего handler.

### Git

- **Системный `git` через `os/exec`**
  - Не используем `go-git` в MVP.
  - Причина: нужен настоящий git behavior как в терминале, включая корректную работу с индексом, merge/conflict behavior и совместимость с обычными git-инструментами.
  - Каждый vault — отдельная папка и отдельный git-репозиторий.
  - На каждый vault/repo создаётся своя последовательная git queue.

### File Watcher

- **`github.com/fsnotify/fsnotify`**
  - Слежение за изменениями vault от WebDAV и внешних процессов.
  - События должны проходить через debounce и git queue конкретного vault.
  - Нужно игнорировать `.git/**`, data-dir/SQLite и временные файлы.

### SQLite Driver

- **`modernc.org/sqlite`**
  - Pure Go SQLite driver.
  - Удобнее для single-binary/distribution, потому что не требует CGO.
  - На старте приложения включаем WAL:

```sql
PRAGMA journal_mode=WAL;
```

Альтернатива: `github.com/mattn/go-sqlite3`, если позже понадобится поведение/расширения SQLite, ради которых приемлем CGO.

### Password Hashing

- **`golang.org/x/crypto/argon2`** или **`golang.org/x/crypto/bcrypt`**
  - Пароли не хранятся plaintext.
  - Для MVP практичнее `bcrypt`: проще параметры, проще эксплуатация.
  - `argon2id` можно выбрать позже, если нужна более строгая настройка memory-hard hashing.

### Sessions

- **Своя server-side session table в SQLite**
  - Cookie хранит только случайный opaque session id.
  - Состояние сессии хранится в SQLite.
  - JWT в MVP не используем.

### Config

- **Env variables**
  - Основной способ конфигурации для Docker и `.env`.
  - Минимальный набор:
    - `VAULTS_ROOT`;
    - `DATA_DIR`;
    - `HTTP_ADDR`;
    - `GIT_BIN`;
    - `DEFAULT_FILE_ROOT`;
    - `COMMIT_DEBOUNCE`;
    - `LOCK_TTL`;
    - `SESSION_TTL`;
    - `BOOTSTRAP_USERNAME`;
    - `BOOTSTRAP_PASSWORD`.
  - `VAULTS_ROOT` — root-директория для всех vaults, а не путь к vault конкретного пользователя.
  - `DEFAULT_FILE_ROOT` — папка, которую web UI открывает внутри vault по умолчанию. Значение `.` означает настоящий root vault. WebDAV root остаётся `/webdav/<vault-slug>/`.

- **`github.com/caarlos0/env/v11`** или ручной парсинг env
  - Для MVP можно начать с ручного парсинга, чтобы не добавлять зависимость.
  - Если конфиг разрастётся, подключить `caarlos0/env`.

### Logging

- **Go standard library `log/slog`**
  - Structured logging без внешней зависимости.
  - Нельзя логировать пароли, session ids, auth headers и содержимое приватных файлов.

## Frontend

### Core

- **React**
  - UI приложения: file tree, editor layout, auth form, file operations.
  - Используем function components, hooks, controlled forms.

- **Vite**
  - Dev server с HMR во время разработки.
  - Production build через `npm run build`.
  - В dev можно использовать Vite proxy для `/api` и `/webdav` на Go backend.
  - В production Go отдаёт собранную статику через `embed.FS`.

### Markdown Editor

- **`@uiw/react-codemirror`**
  - React wrapper для CodeMirror 6.
  - Поддерживает controlled `value`/`onChange`.
  - Важно мемоизировать extensions, чтобы не пересоздавать конфигурацию редактора на каждый render.

- **CodeMirror packages**
  - `@codemirror/lang-markdown`;
  - `@codemirror/language-data`;
  - дополнительные пакеты CodeMirror по необходимости.

### Markdown Preview

- **`react-markdown`**
  - Базовый React renderer для markdown.

- **`remark-gfm`**
  - GFM: tables, task lists, strikethrough.

- **`remark-frontmatter`**
  - Распознавание YAML frontmatter.

- **`rehype-highlight`** или **`shiki`**
  - Syntax highlighting для code blocks.
  - Для MVP проще `rehype-highlight`.
  - `shiki` красивее, но тяжелее и может усложнить bundle/runtime.

### State/Data Fetching

- **Native `fetch` + local React state**
  - Для MVP достаточно.
  - TanStack Query не добавляем на старте, чтобы не усложнять стек.
  - Можно добавить позже, если появятся сложное кеширование, optimistic updates и много параллельных API-запросов.

### Styling

- **CSS Modules или plain CSS**
  - Для MVP лучше plain CSS/CSS Modules без UI framework.
  - Tailwind, MUI, Chakra и другие UI frameworks не добавляем без отдельного решения.
  - Глобальная theme-система обязательна: CSS custom properties, верхнеуровневые `data-theme` и `data-accent`.
  - Цвета в компонентах должны использовать theme tokens.
  - Visual direction: мягкий Obsidian/Zed-like workspace, не marketing UI.
  - Background themes: `black`, `dark`, `warm`, `light`.
  - Accent colors: violet, blue, cyan, green, amber, rose.
  - Theme/accent persistence в MVP через `localStorage`.

### Icons

- **`lucide-react`**
  - Маленькая библиотека иконок.
  - Подходит для toolbar/file tree/buttons.

## Build And Release

### Development

- Go backend запускается отдельно.
- Vite frontend запускается отдельно.
- Frontend ходит в backend через Vite proxy или CORS.

### Production

- `npm run build` собирает frontend static assets.
- Go build встраивает frontend assets через `embed.FS`.
- Docker build использует `vendor/` и `go build -mod=vendor`, чтобы backend stage не зависел от скачивания Go-модулей во время сборки image.
- Конечный пользователь получает один бинарник.
- Docker image может запускать этот же бинарник и монтировать:
  - vault volume;
  - data-dir volume.

## Docker

- **Dockerfile** для production image.
- **docker-compose.yml** для локального/self-hosted запуска.
- **`.env.example`** с основными параметрами.
- Vault и data-dir должны быть отдельными mount points:
  - `/vaults`;
  - `/data`.

## Данные И Изоляция

- `users` — аккаунты и auth identity.
- `vaults` — самостоятельные хранилища; каждый vault имеет свой path, kind и git repo.
- `vault_members` — связь пользователя с vault и роль доступа.
- В MVP при bootstrap/create user создаётся personal vault и membership `owner`.
- Shared vaults и управление участниками добавляются позже, но схема не должна требовать переписывания storage/git слоёв.
- WebDAV в MVP маршрутизируется к vault по `/webdav/<vault-slug>/`, а не к "папке пользователя".
- Дефолтная рабочая папка web UI задаётся `DEFAULT_FILE_ROOT` и не меняет WebDAV path semantics.

## Тестирование

### Backend

- **Go standard `testing`**
  - Unit tests для path safety, locks, auth/session, git queue.

- **`net/http/httptest`**
  - API tests без поднятия внешнего сервера.

- **Temporary directories**
  - Git/WebDAV/file tests должны работать в temp vault.

### Frontend

- **Vitest**
  - Unit tests для чистых UI/helpers.

- **React Testing Library**
  - Component tests для ключевых UI-сценариев.

### E2E

- **Playwright** — позже, когда появится стабильный web UI.
  - В MVP-скелете можно не подключать сразу.

## Не используем в MVP

- `go-git` — вместо него системный `git`.
- JWT — вместо него server-side sessions.
- PostgreSQL/MySQL — SQLite достаточно для runtime-state MVP.
- Redis — не нужен для single-instance MVP.
- CRDT/Yjs — только Фаза 2.
- WYSIWYG markdown editors — редактор MVP строится на source mode.
- Tailwind/MUI/Chakra — не добавляем без отдельного решения по дизайну.
- Git remote sync/backup — отдельная функция после локального git MVP.
- App-passwords для WebDAV — позже, если понадобится отзыв доступа с одного устройства.

## Открытые решения по стеку

- Password hashing по умолчанию: `bcrypt`.
- SQLite driver: `modernc.org/sqlite` без CGO.
- Подтвердить CSS-подход: plain CSS или CSS Modules.
- Подтвердить syntax highlighter: `rehype-highlight` или `shiki`.
- Решить, подключать ли `go-chi/chi/v5` сразу или начать на чистом `net/http`.
