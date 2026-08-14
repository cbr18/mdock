# Remotely Save WebDAV compatibility hardening

Status: CREATED
Created: 2026-08-14 18:04
Project: mdock
Plan: [14_08_2026_18_04_remotely_save_webdav_compatibility.md](../plans/14_08_2026_18_04_remotely_save_webdav_compatibility.md)

## Проблема

WebDAV MVP уже позволяет подключиться из Obsidian/Remotely Save и писать файлы, но совместимость пока не зафиксирована как обязательный контракт. Remotely Save должен быть основным целевым WebDAV-клиентом Фазы 1, иначе есть риск silent data loss, некорректных sync decisions или проблем на мобильных клиентах Obsidian.

## Доказательства

- Ручная проверка показала успешные `PROPFIND`, `MKCOL`, `PUT` и git-коммиты из Remotely Save.
- До hotfix были ошибки SQLite `database is locked` при пачке WebDAV-запросов.
- `PROPFIND` уже отдаёт `ETag`/`Last-Modified`, но href paths ещё нужно довести до строгой совместимости с пробелами/Unicode.
- Документация Remotely Save указывает, что WebDAV target использует подпапку `${vaultName}`.
- Документация Remotely Save указывает, что для Android/части старых Obsidian клиентов требуется CORS для Obsidian origins, WebDAV methods и WebDAV headers.
- Аудит `remotely-save/remotely-save` (`src/fsWebdav.ts`) показал, что WebDAV adapter использует пакет `webdav@^5.6.0`, а не raw HTTP.
- `DEFAULT_WEBDAV_CONFIG` в `src/fsWebdav.ts` задаёт `authType=basic`, `depth=manual_1`, `manualRecursive=true`, `remoteBaseDir=""`; runtime берёт `remoteBaseDir || vaultName`.
- `_init()` проверяет существование `/${remoteBaseDir}/` через `exists`, создаёт его через `createDirectory`, затем вызывает `getDAVCompliance`.
- `walk()` в default/depth=`manual_1` делает BFS через `getDirectoryContents(path, { deep: false })`, то есть много `PROPFIND Depth: 1`; при `manual_infinity` делает один `getDirectoryContents(..., { deep: true })`, то есть `PROPFIND Depth: infinity`.
- `checkConnectCommonOps()` создаёт тестовую папку, пишет файл 100 bytes, перезаписывает 200 bytes, скачивает, удаляет файл и папку.
- `writeFile()` для файлов <= 10 MB делает обычный `PUT` с `overwrite: true`, потом обязательно `stat`.
- Для файлов > 10 MB Remotely Save может использовать partial/chunk upload только если сервер выглядит как Nextcloud/Apache partial/Sabre partial; mdock не должен объявлять такие DAV capabilities, пока не поддерживает их реально.
- `rename()` использует WebDAV `MOVE`, `rm()` использует `DELETE`; ошибки `DELETE` в adapter логируются, но могут не падать наружу, поэтому server-side status/logging особенно важны.
- Настройки плагина меняют требования: `remoteBaseDir`, `depth`, `customHeaders`, `concurrency`, `syncConfigDir`, `syncBookmarks`, `syncUnderscoreItems`, `skipSizeLargerThan`, `ignorePaths`, `onlyAllowPaths`, `syncDirection`, `conflictAction`, `password`/`encryptionMethod`.

## Нефункциональные ограничения

- Не логировать пароли, Basic Auth header, session cookies и содержимое приватных заметок.
- Не ослаблять vault-safe path ограничения: path traversal, `.git`, symlink escape должны оставаться запрещены.
- Не добавлять nginx/Authelia/app-passwords в рамках задачи.
- Не добавлять conflict branch для WebDAV.
- Локи должны оставаться лёгкими: без блокировки всего vault и без бессмысленных долгих lock intervals.
- Поведение должно быть покрыто тестами в dev/test Docker stack.

## Не входит в задачу

- Полная поддержка всех WebDAV clients.
- Web UI/editor.
- Shared vault UI.
- Remote git backup.
- Реализация E2E encryption Remotely Save на стороне сервера: при включённом password плагин сам шифрует имена/контент до WebDAV, сервер хранит opaque файлы.
- Digest Auth: Remotely Save умеет `digest`, но mdock MVP официально поддерживает Basic Auth.
- Nextcloud chunk upload, Apache partial update, Sabre partial update и `PATCH`: не объявлять capabilities, пока они не реализованы.
- Автоматизированный запуск реального Obsidian desktop/mobile в CI.

## Желаемое поведение

- Remotely Save подключается к `/webdav/<vault-slug>/` через Basic Auth тем же логином/паролем, что web.
- Подпапка `${vaultName}` или заданный пользователем `remoteBaseDir` создаётся и синхронизируется без специальных настроек на сервере.
- Пути с пробелами, кириллицей и вложенными директориями корректно проходят `PROPFIND`, `GET`, `PUT`, `DELETE`, `MOVE`.
- `PROPFIND` возвращает корректный `207 Multi-Status`, percent-encoded `href`, `resourcetype`, `getcontentlength`, `getlastmodified`, `getetag`.
- `PROPFIND Depth: 1` работает как основной режим Remotely Save.
- `PROPFIND Depth: infinity` в MVP не поддерживается; документация должна явно рекомендовать настройку Remotely Save `only supports depth='1'`.
- `GET`/`HEAD` возвращают `ETag` и `Last-Modified`.
- `PUT` возвращает `201 Created` для нового файла и `204 No Content` при overwrite.
- После `PUT` последующий `stat`/`PROPFIND` должен видеть новый размер и новое `Last-Modified`, потому что Remotely Save опирается на `size` и `lastmod`.
- `MKCOL`, `DELETE`, `MOVE` возвращают WebDAV-compatible status codes для missing/existing/conflict cases.
- `LOCK`/`UNLOCK` и write operations не создают лишних тяжёлых блокировок, но защищают от записи поверх активного lock другого owner.
- CORS preflight работает для Obsidian origins: `app://obsidian.md`, `capacitor://localhost`, `http://localhost`.
- Пользовательские `customHeaders` не должны ломать запросы: неизвестные headers допустимы и не должны приводить к `400`.
- Параллельность Remotely Save (`concurrency`, default 5) не должна приводить к `database is locked`, race в файловых операциях или некорректным git commits.
- Настройки `syncConfigDir`, `syncBookmarks`, `syncUnderscoreItems`, `ignorePaths`, `onlyAllowPaths`, `skipSizeLargerThan`, `syncDirection`, `conflictAction` не требуют специальной server-side логики, но сервер должен корректно обслуживать resulting file operations.
- При включённом Remotely Save encryption сервер видит opaque filenames/content и должен хранить их как обычные файлы без попытки интерпретации.
- Ошибки sync видны в server logs по method/path/status/duration без секретов.

## Затронутые области

- `internal/webdav/`
- `internal/vault/`
- `internal/store/`
- `internal/locks/`
- `test/smoke/`
- `docs/`

## Заметки по реализации

- Сделать helper для WebDAV href: percent-encode path segments через стандартные URL helpers, не ломая `/`.
- CORS добавлять только для разрешённых Obsidian origins и только на WebDAV routes.
- Для status codes перед modifying operation проверять существование target/source через `vault.Stat`.
- Для `MOVE` учитывать `Destination` как absolute URL или path внутри того же vault.
- Для `MOVE` учесть `Overwrite` header, потому что пакет `webdav` может посылать overwrite-семантику через стандартный WebDAV client.
- Для directory `PROPFIND` не отдавать бессмысленный OS directory size как file length.
- Для `Depth: infinity` вернуть совместимое явное поведение и не отдавать ложный одноуровневый ответ как будто это recursive result; в документации зафиксировать настройку Remotely Save `depth='1'` как обязательную для MVP.
- `OPTIONS`/`DAV` не должны объявлять Nextcloud/Apache/Sabre partial capabilities.
- Расширить smoke test сценариями, похожими на Remotely Save: `${vaultName}` directory, `.obsidian/plugins/remotely-save/*`, Unicode filename, overwrite, move, delete.
- Отдельно покрыть Remotely Save connectivity check flow: `MKCOL` test dir -> `PUT` 100 bytes -> overwrite 200 bytes -> `GET` compare -> `DELETE` file -> `DELETE` dir.

## Критерии приёмки

- Документация фиксирует Remotely Save как основной WebDAV compatibility target Фазы 1.
- Task/plan содержат результаты аудита `src/fsWebdav.ts` и настройки плагина, которые меняют WebDAV behavior.
- `go test ./...` проходит.
- `npm test` проходит, если frontend/test tooling затронуты косвенно.
- `./test/run-smoke.sh` проходит против запущенного `./test/docker-compose.yml`.
- Smoke покрывает Unicode/space paths и `${vaultName}` subfolder.
- Smoke покрывает Remotely Save connectivity check flow.
- Smoke покрывает `Depth: 1`; `Depth: infinity` явно задокументирован как unsupported в MVP с рекомендацией настройки `depth='1'`.
- Ручная проверка Remotely Save может создать/обновить заметку и после sync файл остаётся на сервере и попадает в git commit.

## План тестирования

- `env GOCACHE=/tmp/go-cache go test ./...`
- `npm test`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- Ручной сценарий Remotely Save:
  - подключить `/webdav/<vault-slug>/`;
  - использовать Basic Auth;
  - проверить default `Depth Header Sent To Servers = only supports depth='1'`;
  - создать vault subfolder из Obsidian;
  - создать файл с кириллицей/пробелом;
  - выполнить sync;
  - проверить содержимое файла на сервере;
  - проверить git commit в vault repo.
  - отдельно проверить вариант с custom `Remote Base Dir`;
  - отдельно проверить `Sync config dir`, потому что он загружает `.obsidian/plugins/remotely-save/*`;
  - отдельно проверить, что `supports depth='infinity'` не рекомендуется и не маскируется сервером как корректный recursive sync.

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить изменения WebDAV handler, smoke tests и документации по этой задаче. Реальные vault directories, пользовательские файлы, SQLite data и Docker volumes не удалять без отдельного явного запроса.
