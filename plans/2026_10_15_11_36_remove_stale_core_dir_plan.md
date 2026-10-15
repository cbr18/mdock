# Plan: Удаление старой папки core/ из пакета @mdock/editor

**Task: [2026_10_15_11_36_remove_stale_core_dir.md](../tasks/2026_10_15_11_36_remove_stale_core_dir.md)**

## Последовательность реализации
1. Проверить, чем корневой `packages/mdock-editor/index.ts`, `react/*` и `core/*` используются в сборке (`package.json` `main`/`exports`, ссылки из других файлов).
2. Перевести корневой `packages/mdock-editor/index.ts` на реэкспорт из `./src/core` / `./src/react`, либо удалить корневые файлы, если сборка их не использует.
3. Починить импорты в `packages/mdock-editor/src/tests/*.test.ts` с `'../core/...'` на `'../src/core/...'`.
4. Удалить папки `core/` (и `react/`, если дублирует `src/react/`).
5. Пересобрать и прогнать тесты пакета; сверить `typecheck` до/после.

## Проверки
- `packages/mdock-editor/core/` и корневой `react/` отсутствуют.
- `npm run build` проходит.
- `npm test` проходит (26 passed / 8 skipped — текущий статус).
- `npm run typecheck` не показывает дублей для `core/` vs `src/core/`.

## Риски
- Если какой-то внешний потребитель импортирует `@mdock/editor` по корневым путям, ломается импорт. Проверить, что `package.json` указывает на `dist/` (`main`, `module`, `exports`), а не на корневой `index.ts`.
- Тесты могут ссылаться на `../core` неявно — пройтись grep'ом по всем импортам перед удалением.

## Заметки по откату
- Восстановить файлы из git: `git checkout HEAD -- packages/mdock-editor/core packages/mdock-editor/react packages/mdock-editor/index.ts packages/mdock-editor/src/tests`.
- Корректные импорты в тестах вернуть обратно.
