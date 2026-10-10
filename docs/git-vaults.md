# Git For Vaults

## Базовая модель

Один vault = одна физическая папка внутри `VAULTS_ROOT` = один git-репозиторий = одна git queue.

Пример:

```text
VAULTS_ROOT=/vaults
vault.path=vault-42
/vaults/vault-42/.git
/vaults/vault-42/Obsidian Vault/Без названия.md
```

`vault.slug` нужен для URL, `vault.name` нужен для UI, `vault.path` нужен для стабильного физического хранения. Переименование vault меняет только `name`; `slug` и `path` не меняются.

## Локальная история

Каждый vault имеет локальный git repo с branch `main`.

При старте server maintenance для каждого vault:

1. создаёт каталог vault, если его нет;
2. делает `git init -b main`, если repo ещё нет;
3. приводит HEAD к `main`;
4. если `git status --porcelain` dirty, делает recovery commit всего состояния;
5. чистит истёкшие sessions и file locks.

Recovery commit нужен, чтобы после crash/restart не оставлять рабочую директорию в неопределённом состоянии.

При штатной остановке `SIGTERM`/`SIGINT` сервер не должен полагаться на recovery path. Порядок graceful shutdown:

1. остановить приём новых HTTP-запросов через `http.Server.Shutdown`;
2. дождаться завершения активных handlers в пределах shutdown timeout;
3. закрыть все git queues;
4. для каждой queue остановить debounce timer, дождаться текущей git-операции и flush'нуть pending changes;
5. выйти.

Если процесс убит жёстко или shutdown timeout истёк, следующий старт всё равно подберёт dirty state recovery-коммитом.

## Очередь git-операций

На каждый vault есть отдельная in-memory queue.

Правила:

- git-операции внутри одного vault идут последовательно;
- разные vault'ы не блокируют друг друга;
- queue даёт эффект mutex для repo, а не для всего приложения;
- WebDAV/file операции сначала меняют файл, потом ставят git task;
- несколько изменений в debounce-window коммитятся вместе;
- commit message включает источник и количество файлов;
- queue хранит pending paths in-memory; если процесс упал до flush, startup recovery commit подберёт dirty состояние после рестарта.

Формат commit message:

```text
sync(webdav): update 1 file
sync(web): update 2 files
sync(mixed): update 3 files
recovery: uncommitted changes on startup
```

Если в один debounce-window попали изменения из разных источников, используется `sync(mixed)`.

## Обработка ошибок flush

При ошибке git-операции (`git add` или `git commit`) pending paths **не теряются**:

1. **Snapshot вместо очистки**: перед git-операцией делается копия pending; сама in-memory карта очищается, но snapshot сохраняется.
2. **Восстановление при ошибке**: если `Add` или `Commit` вернул ошибку, snapshot сливается обратно в pending (merge-only-missing — более новые `Enqueue` не затираются).
3. **Перевооружение таймера**: после восстановления pending переустанавливается debounce-таймер. Повторный flush произойдёт через `debounce` (default 5s), не busy-loop.
4. **Успешный flush**: при успехе snapshot отбрасывается, persisted pending (SQLite) очищается, `LastError()` сбрасывается в `nil`.
5. **Observability**: `Len()` и `LastError()` отражают фактическое состояние очереди. При ошибке `Len() > 0`, `LastError() != nil`.

Это поведение работает на уровне in-memory queue и не требует durable SQLite queue. Recovery commit при старте остаётся страховкой на случай жёсткого crash процесса или хоста.

## Attachments And Binary Files

MVP-решение: коммитим всё содержимое vault как есть, включая картинки, PDF и другие Obsidian attachments.

Причины:

- Obsidian хранит attachments внутри vault, и игнорировать их по умолчанию опаснее, чем раздувать repo;
- пользователь ожидает, что git/backup покрывает весь vault, а не только `.md`;
- `.gitignore` или size threshold могут незаметно исключить важные файлы.

Минусы решения:

- repo может быстро расти на больших бинарниках;
- git diff/history для бинарных файлов почти бесполезны.

Будущая настройка может добавить per-vault ignore patterns или size threshold, но только как явную пользовательскую политику. В MVP скрытой автоматической фильтрации нет.

## Remote Backup

Remote optional. Если remote не настроен, mdock не делает push и не считает это ошибкой.

Текущая модель:

- remote хранится в SQLite как `vault.remote_url`;
- remote name внутри repo: `backup`;
- manual push через `POST /api/vaults/{slug}/git/push`;
- перед push queue flush'ится;
- push сериализуется через тот же per-vault exclusive lock;
- embedded credentials в URL запрещены;
- SSH keys, deploy keys или credential helper настраиваются вне mdock.

Будущий auto-push:

- включается только если `remote_url` не пустой;
- запускается после успешного local commit или по расписанию;
- ошибки push пишутся в `last_push_error`, но не должны ломать локальную работу vault;
- retry/backoff worker в MVP не реализуется;
- если remote временно недоступен, следующая ручная команда push или будущий auto-push trigger попробует снова;
- повторный push должен быть идемпотентным относительно уже запушенных commits.

## Локи И Git

File locks не являются git-lock'ами.

Локи нужны только для предотвращения очевидной одновременной записи одного файла:

- чтение не блокируется;
- разные файлы не блокируют друг друга;
- весь vault не блокируется;
- git queue не блокируется lock'ом файла дольше самой операции записи;
- WebDAV write в активно залоченный другим owner файл получает `423 Locked`.

Git отвечает за историю и recovery, а не за live merge UI. Conflict branch для WebDAV в MVP не используется, потому что Obsidian/Remotely Save не покажет пользователю нормальный merge flow.
