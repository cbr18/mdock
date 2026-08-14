# Remotely Save WebDAV compatibility hardening

Task: [14_08_2026_18_04_remotely_save_webdav_compatibility.md](../tasks/14_08_2026_18_04_remotely_save_webdav_compatibility.md)

## Последовательность реализации

1. Зафиксировать Remotely Save как основной WebDAV compatibility target в ТЗ и tech stack.
2. Зафиксировать результаты аудита `remotely-save/src/fsWebdav.ts`:
   - пакет `webdav@^5.6.0`;
   - default `authType=basic`;
   - default `depth=manual_1`;
   - optional `depth=manual_infinity`;
   - `remoteBaseDir || vaultName`;
   - `checkConnectCommonOps` flow;
   - `customHeaders`;
   - concurrency/sync-direction/config/encryption settings.
3. Довести `PROPFIND` до совместимости с Remotely Save:
   - percent-encoded `href`;
   - корректные свойства файлов и директорий;
   - отсутствие file-only properties там, где они неуместны для collection.
4. Поддержать default режим Remotely Save `Depth: 1`; `Depth: infinity` в MVP не реализовывать:
   - явно задокументировать настройку Remotely Save `only supports depth='1'`;
   - не отдавать на `Depth: infinity` ложный одноуровневый ответ как будто это recursive result.
5. Добавить WebDAV CORS для Obsidian origins и нужных WebDAV methods/headers.
6. Исправить status codes для `PUT`, `MKCOL`, `DELETE`, `MOVE` с учётом существования source/target и `Overwrite` header.
7. Проверить `LOCK`/`UNLOCK` и write locks на отсутствие лишних тяжёлых блокировок.
8. Не объявлять Nextcloud/Apache/Sabre partial capabilities, пока нет поддержки chunk/partial upload.
9. Расширить smoke tests сценарием, имитирующим Remotely Save:
   - `${vaultName}` subfolder;
   - custom `remoteBaseDir`;
   - `.obsidian/plugins/remotely-save/*`;
   - Unicode filename;
   - overwrite;
   - move/delete;
   - connectivity check flow;
   - git commit после sync.
10. Проверить настройки Remotely Save, которые меняют только набор файлов, но не требуют server-side логики:
   - `syncConfigDir`;
   - `syncBookmarks`;
   - `syncUnderscoreItems`;
   - `ignorePaths`;
   - `onlyAllowPaths`;
   - `skipSizeLargerThan`;
   - `syncDirection`;
   - `conflictAction`;
   - encryption password/method.
11. Прогнать unit tests, frontend tests и docker smoke.
12. Обновить task-файл результатами валидации и commit hashes после коммита.

## Проверки

- `env GOCACHE=/tmp/go-cache go test ./...`
- `npm test`
- `docker compose config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- Ручная проверка Remotely Save на локальном stack.
- Ручная проверка Remotely Save с default `depth='1'`.
- Ручная проверка Remotely Save с custom `Remote Base Dir`.
- Ручная проверка Remotely Save с включённым `Sync config dir`.
- Ручная проверка, что Remotely Save настроен на `only supports depth='1'`; `supports depth='infinity'` не используется в MVP.

## Риски

- Remotely Save может менять поведение между версиями; интеграционные проверки должны фиксировать наблюдаемое WebDAV-поведение, а не внутренности plugin implementation.
- Слишком широкие CORS headers могут расширить поверхность атаки; origins нужно allowlist-ить.
- Более строгие WebDAV status codes могут вскрыть ранее скрытые ошибки клиента; это лучше, чем silently overwrite.
- Percent-encoding href нельзя делать двойным кодированием, иначе клиенты перестанут находить Unicode paths.
- Если mdock случайно объявит Nextcloud/Sabre/Apache partial capabilities, Remotely Save может начать использовать chunk/partial upload, которого у нас нет.
- `Depth: infinity` может быть дорогим на больших vault; в MVP его не реализуем, чтобы не добавлять дорогой recursive path без лимитов.

## Заметки по откату

Откатить изменения WebDAV handler и тестов. Документационное требование Remotely Save можно оставить, если откат временный и задача остаётся открытой.
