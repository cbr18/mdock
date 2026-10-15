# Task: Удаление старой папки core/ из пакета @mdock/editor

**Status: CREATED**

**Plan: [2026_10_15_11_36_remove_stale_core_dir_plan.md](../plans/2026_10_15_11_36_remove_stale_core_dir_plan.md)**

## Проблема
В корне пакета `packages/mdock-editor` осталась папка `core/` — дубликат актуального кода, который после извлечения библиотеки (коммит `388ef39`) живёт в `src/core/`. Папка `core/`:
- трекается в git и не игнорируется;
- компилируется tsc (`include: ["src"]` + реэкспорт корневого `index.ts` → `packages/mdock-editor/index.ts` делает `export * from './core'`), из-за чего тайпчек даёт дублирующиеся ошибки для одних и тех же файлов (например `core/extensions/livePreview.ts` и `src/core/extensions/livePreview.ts`);
- ссылки на неё остались в корневых `packages/mdock-editor/index.ts`, `packages/mdock-editor/react/*` и в тестах `src/tests/*.test.ts` (импорты вида `../core/...`).

## Доказательства
- `packages/mdock-editor/core/` существует, в git: `git ls-files packages/mdock-editor/core/` показывает 10 файлов.
- `packages/mdock-editor/index.ts` начинается с `export * from './core';`.
- `packages/mdock-editor/react/*.ts` и `web`-независимые тесты импортируют `../core` / `./core`.
- `diff packages/mdock-editor/core/* vs packages/mdock-editor/src/core/*` — файлы отличаются (старая копия).
- `npm run typecheck` в `packages/mdock-editor` выдаёт ошибки дважды: для путей `core/...` и `src/core/...` (например `core/extensions/livePreview.ts(8,*)` и `src/core/extensions/livePreview.ts(8,*)`).

## Нефункциональные ограничения
- Каталог `src/` — единственный источник истины для кода библиотеки.
- Изменения должны сохранять работоспособность `packages/mdock-editor` (build + test + typecheck без появления новых ошибок относительно текущего состояния).
- Не менять публичный API пакета: то, что экспортируется из `packages/mdock-editor/index.ts` и `react/index.ts`, должно остаться экспортируемым (через `src/`).
- Не трогать `web/src/lib/editor` — его зеркальная структура уже правильная (`core` внутри `src/`, без корневой `core/`).

## Желаемое поведение
1. Папка `packages/mdock-editor/core/` удалена (и корневые `packages/mdock-editor/react/`, если они тоже дублируют `src/react/`).
2. Все импорты, ссылающиеся на корневой `core/` и корневой `react/`, переведены на `src/core` / `src/react`.
3. `npm run typecheck`, `npm run build`, `npm test` в `packages/mdock-editor` проходят не хуже, чем до изменения (не добавляем новых ошибок).
4. `git status` больше не показывает несвязанных изменений.

## Затронутые области
- `packages/mdock-editor/core/` (удаление)
- `packages/mdock-editor/react/` (удаление, если дублирует `src/react/`)
- `packages/mdock-editor/index.ts` (перевод на `src/...`)
- `packages/mdock-editor/src/tests/*.test.ts` (импорты `../core/...` → `../src/core/...`, либо удаление дублей тестов)
- `packages/mdock-editor/package.json` (при необходимости: `main`/`exports`, если указывали на корневые файлы)

## Заметки по реализации
- Проверить, что `package.json` пакета использует `dist/` как `main`/`module`, а не корневые `index.ts`. Если корневой `index.ts` не используется сборкой — удалить вместе с `core/`/`react/`.
- В тестах `src/tests/*.test.ts` импорты `'../core/...'` заменить на `'../src/core/...'` или на `'./{actual-path}'` в зависимости от структуры.
- После правок: `cd packages/mdock-editor && npm run build && npm test && npm run typecheck`.

## Критерии приёмки
- [ ] `packages/mdock-editor/core/` и `packages/mdock-editor/react/` (если дубли) отсутствуют в рабочем дереве.
- [ ] Корневых `index.ts`/`react/`, указывающих на `./core`, нет.
- [ ] `npm run build` в `packages/mdock-editor` проходит.
- [ ] `npm test` в `packages/mdock-editor` проходит (текущий статус: 26 passed / 8 skipped).
- [ ] `npm run typecheck` в `packages/mdock-editor` не показывает дублей ошибок для `core/` против `src/core/` (предсуществующие ошибки в `toolbarActions.test.ts`, `markdownCommands.ts` и т.п. могут остаться — они записаны как известные).

## План тестирования
- `cd packages/mdock-editor && npm run build`
- `cd packages/mdock-editor && npm test`
- `cd packages/mdock-editor && npm run typecheck` — сверить список ошибок до/после (не должно появиться новых; дубли должны исчезнуть).

## Результаты валидации
_Заполняется после реализации._

## Откат
- Восстановить удалённые файлы: `git checkout HEAD -- packages/mdock-editor/core packages/mdock-editor/react packages/mdock-editor/index.ts packages/mdock-editor/src/tests`.
- Отменить правки импортов в тестах.
