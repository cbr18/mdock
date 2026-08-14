# Git Shutdown And Policy Plan

Task: [14_08_2026_22_59_git_shutdown_and_policy.md](../tasks/14_08_2026_22_59_git_shutdown_and_policy.md)

## Последовательность реализации

1. Добавить закрытие всех очередей в `QueueRegistry`.
2. Добавить shutdown hook в app service.
3. Вызвать service shutdown из `cmd/mdock` после HTTP shutdown.
4. Расширить queue pending state, чтобы commit message строился из source и количества файлов.
5. Обновить тесты git queue.
6. Обновить `docs/git-vaults.md` по четырём решениям.
7. Прогнать `go test ./...`.

## Проверки

- `go test ./...`

## Риски

- Изменение pending структуры очереди может повлиять на debounce grouping.
- Shutdown timeout может прервать долгий git push/commit; это лучше, чем зависнуть навсегда.

## Заметки по откату

- Откатить commit; dirty state после отката при следующем старте подберёт recovery commit.
