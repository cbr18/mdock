# Remotely Save setup documentation

Status: CREATED
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

- Пока не выполнялось.

## Откат

Откатить документационные изменения.
