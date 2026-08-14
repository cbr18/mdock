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

## Очередь git-операций

На каждый vault есть отдельная in-memory queue.

Правила:

- git-операции внутри одного vault идут последовательно;
- разные vault'ы не блокируют друг друга;
- queue даёт эффект mutex для repo, а не для всего приложения;
- WebDAV/file операции сначала меняют файл, потом ставят git task;
- несколько изменений в debounce-window коммитятся вместе;
- commit message для sync сейчас общий: `sync: update vault files`;
- queue хранит pending paths in-memory; если процесс упал до flush, startup recovery commit подберёт dirty состояние после рестарта.

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
