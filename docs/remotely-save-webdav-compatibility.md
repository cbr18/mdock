# Remotely Save WebDAV compatibility notes

Документ фиксирует результаты аудита Remotely Save для реализации WebDAV compatibility в mdock.

## Источник

- Репозиторий: `remotely-save/remotely-save`.
- Основной файл: `src/fsWebdav.ts`.
- Типы настроек: `src/baseTypes.ts`.
- UI настроек: `src/settings.ts`.
- Текущая зависимость: `webdav@^5.6.0`.

## Как Remotely Save ходит в WebDAV

- Использует npm-пакет `webdav`, поверх него класс `FakeFsWebdav`.
- Default config:
  - `authType=basic`;
  - `depth=manual_1`;
  - `manualRecursive=true`;
  - `remoteBaseDir=""`.
- Runtime base dir: `remoteBaseDir || vaultName || ""`.
- При `_init()`:
  - проверяет `/${remoteBaseDir}/` через `exists`;
  - если папки нет, создаёт её через `createDirectory`;
  - вызывает `getDAVCompliance`.
- Default обход дерева:
  - `depth=manual_1`;
  - BFS по директориям;
  - каждый уровень запрашивается через `getDirectoryContents(path, { deep: false })`;
  - практически это много `PROPFIND Depth: 1`.
- Optional обход дерева:
  - `depth=manual_infinity`;
  - один recursive `getDirectoryContents(path, { deep: true })`;
  - практически это `PROPFIND Depth: infinity`.

## Connectivity Check

`checkConnectCommonOps()` проверяет не только логин:

1. `MKCOL` тестовой папки.
2. `PUT` тестового файла на 100 bytes.
3. overwrite того же файла на 200 bytes.
4. `GET` и сравнение содержимого.
5. `DELETE` файла.
6. `DELETE` папки.

Этот flow должен быть отдельным smoke-сценарием mdock.

## Записи и metadata

- Обычные файлы до 10 MB отправляются полным `PUT` с `overwrite=true`.
- После записи Remotely Save делает `stat`, поэтому сервер сразу должен отдавать актуальные `size`, `lastmod`, `etag`.
- Для файлов больше 10 MB Remotely Save может использовать chunk/partial upload, только если сервер выглядит как Nextcloud, Apache partial или Sabre partial.
- mdock не должен объявлять такие DAV capabilities, пока `PATCH`/chunk upload не реализованы.

## Настройки, которые меняют требования

- `remoteBaseDir`: пользователь может задать папку вместо `${vaultName}`.
- `depth`: `manual_1` или `manual_infinity`.
- `authType`: `basic` или `digest`; mdock MVP поддерживает только Basic Auth.
- `customHeaders`: сервер должен терпеть неизвестные headers.
- `concurrency`: default `5`, значит параллельные WebDAV requests нормальны.
- `syncConfigDir`: включает синхронизацию `.obsidian`, включая `.obsidian/plugins/remotely-save/*`.
- `syncBookmarks`: добавляет `.obsidian/bookmarks.json`.
- `syncUnderscoreItems`: влияет на набор файлов с `_`.
- `ignorePaths`/`onlyAllowPaths`: меняют набор файлов на клиенте, серверной логики не требуют.
- `skipSizeLargerThan`: может убирать большие файлы из sync.
- `syncDirection`: push/pull/delete-only режимы меняют пропорцию `PUT`/`GET`/`DELETE`.
- `conflictAction`: Remotely Save принимает конфликтные решения по своей локальной истории, server-side merge UI не нужен.
- `password`/`encryptionMethod`: при включённом encryption сервер видит opaque имена/контент и хранит их как обычные файлы.

## Требования к mdock

- Рекомендуемый режим Remotely Save для MVP: Basic Auth, `Depth Header Sent To Servers = only supports depth='1'`.
- `Depth: infinity` в MVP не поддерживаем и не рекомендуем включать в Remotely Save; поддержку можно добавить отдельной задачей после базовой стабильности.
- Обязательные методы: `OPTIONS`, `PROPFIND`, `GET`, `HEAD`, `PUT`, `MKCOL`, `DELETE`, `MOVE`.
- `LOCK`/`UNLOCK` поддерживаются как совместимость с WebDAV clients, но Remotely Save adapter напрямую на них не опирается в обычном flow.
- `href` в `PROPFIND` должен быть percent-encoded по path segments.
- Пути с пробелами, Unicode, `.obsidian`, `_` и opaque encrypted именами должны проходить vault-safe resolver.
- CORS нужен для Obsidian mobile/browser origins: `app://obsidian.md`, `capacitor://localhost`, `http://localhost`.
- Не логировать Authorization, cookies, passwords, custom header values и содержимое заметок.
