# Move server policy: locks and git

Task: [22_08_2026_11_45_move_server_policy_locks_git.md](../tasks/22_08_2026_11_45_move_server_policy_locks_git.md)

## Последовательность реализации

1. Проаудировать текущие `MovePath`, `withFileMutationLock`, `locks.Service` и HTTP mapping ошибок.
2. Зафиксировать фактическое git-поведение тестом: successful move должен enqueue/commit `from` и `to`.
3. Добавить тест на move locked file другим пользователем: ожидать `423 Locked`.
4. Добавить тест на move folder с locked descendant: ожидать `423 Locked`.
5. Если descendant-lock проверки нет, добавить в `locks.Service` узкий метод проверки активных locks по prefix внутри vault.
6. Обновить `MovePath`: перед rename проверять locks исходного файла/папки и descendant locks для папки.
7. Проверить, что git enqueue вызывается только после successful rename.
8. Frontend обработку `423` не менять в этой задаче: API уже отдаёт корректный статус, UI использует существующий error path.
9. Прогнать тесты, test stack и smoke.

## Проверки

- `go test ./...` — успешно.
- `npm test` не запускался: frontend не менялся.
- `npm run build` не запускался отдельно: frontend не менялся, prod image build внутри test stack прошёл.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.

## Риски

- Проверка locks по prefix может стать слишком широкой, если не нормализовать path.
- Same-owner lock policy может конфликтовать с текущим web editor flow; для MVP лучше запретить move активного locked файла, чем переносить lock state неявно.
- Git queue может быть асинхронной, поэтому тест нужно писать либо на queue len, либо через flush/commit с контролируемым debounce.

## Заметки по откату

Откатить изменения в app/locks/server tests и возможные frontend error-message changes.
