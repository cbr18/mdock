# Remote git backup

Status: CREATED
Created: 2026-08-14 19:17
Project: mdock
Plan: [14_08_2026_19_17_remote_git_backup.md](../plans/14_08_2026_19_17_remote_git_backup.md)

## Проблема

Vaults сейчас имеют локальные git repos, но нет server-side remote backup/push. Пользователь хотел возможность потом бэкапировать через remote.

## Доказательства

- Git layer делает локальные commits.
- Remote backup/sync в ТЗ вынесен позже.

## Нефункциональные ограничения

- Не хранить secrets небезопасно.
- Не блокировать WebDAV writes remote push-ем.
- Remote errors должны быть видимы.

## Не входит в задачу

- Git merge conflict UI.
- Multi-remote sync.
- GitHub/Forgejo app integration.

## Желаемое поведение

- Vault может иметь remote URL.
- Push выполняется отдельно от локального commit path.
- Ошибки push видны.

## Затронутые области

- `store`
- `git`
- `app`
- `httpapi`
- docs/tests

## Заметки по реализации

- Начать с manual push/backup command/API.
- Credentials story спроектировать отдельно перед реализацией.

## Критерии приёмки

- Локальные commits не зависят от remote availability.
- Remote push errors не теряются.

## План тестирования

- Unit tests с локальным bare remote.
- Smoke/manual test.

## Результаты валидации

- Пока не выполнялось.

## Откат

Откатить remote config/API. Локальные repos не удалять.
