# Remotely Save setup documentation

Status: DONE
Created: 2026-08-14 19:11
Project: mdock
Plan: [14_08_2026_19_11_remotely_save_docs.md](../plans/14_08_2026_19_11_remotely_save_docs.md)

## Проблема

Сервер совместим с Remotely Save в режиме MVP, но пользовательские настройки плагина ещё не описаны явно в README. Без этого можно включить `Depth: infinity` или неверно понять `remoteBaseDir`.

## Доказательства

- Compatibility audit зафиксирован в `docs/remotely-save-webdav-compatibility.md`.
- MVP поддерживает `Depth: 1`, а `Depth: infinity` явно отклоняется.

## Нефункциональные ограничения

- Документация не должна обещать digest/chunk/partial upload.
- Не писать секреты или реальные пароли.

## Не входит в задачу

- Изменения кода WebDAV.
- UI setup wizard.

## Желаемое поведение

- README содержит пошаговую настройку Remotely Save.
- Указаны Basic Auth, WebDAV URL и `Depth Header = only supports depth='1'`.
- Описан смысл `${vaultName}`/`remoteBaseDir`.

## Затронутые области

- `README.md`
- `docs/`

## Заметки по реализации

- Сослаться на compatibility audit.
- Добавить troubleshooting по CORS и Depth.

## Критерии приёмки

- Пользователь может настроить Remotely Save по README.
- Документация совпадает с smoke-tested behavior.

## План тестирования

- Проверить ссылки и команды вручную.

## Результаты валидации

- README обновлён разделом `Obsidian Remotely Save`.
- Указаны smoke-tested настройки: WebDAV URL, Basic Auth, `Depth Header Sent To Servers = only supports depth='1'`.
- Явно указано не включать `supports depth='infinity'` в MVP.
- Описаны `remoteBaseDir`, CORS/reverse proxy troubleshooting и отсутствие partial/chunk capabilities.
- Ссылка на `docs/remotely-save-webdav-compatibility.md` проверена.

## Откат

Откатить документационные изменения.
