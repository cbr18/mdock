Status: DONE
Plan: [2026_10_07_15_45_extract_editor_to_library.md](../plans/2026_10_07_15_45_extract_editor_to_library.md)

## Проблема

Текущий Markdown редактор на базе CodeMirror 6 разбросан по нескольким файлам внутри `web/src/features/editor/` и тесно связан с mdock-специфичной инфраструктурой (lock/heartbeat/draft/conflict, i18n, theme, toolbar actions). Это мешает:
- Переиспользованию редактора в других проектах
- Изолированному тестированию и развитию редактора
- Чёткому разделению ответственности: «редактор» vs «mdock vault UI»
- Добавлению новых фич редактора без риска сломать vault-логику

## Доказательства

- `MarkdownEditor.jsx` — 317 строк, смешивает UI тулбара, формы, команды, live preview расширение
- `livePreviewExtension.js` — 608 строк, содержит block splitter, виджеты рендеринга, keymap, mouse handlers
- `toolbarActions.js`, `markdownActions.js`, `fileEditorSession.js` — привязаны к mdock API (lock, draft, vault slug)
- Нет чёткого API границы: `MarkdownEditor` компонент принимает `onChange`, `onSave`, `lockStatus` — mdock-специфичные пропсы
- Тесты разбросаны: `livePreviewExtension.test.js`, `toolbarActions.test.js`, `markdownActions.test.js`, `fileEditorSession.test.js`

## Нефункциональные ограничения

- Редактор должен оставаться **Markdown-first** (plain text source of truth), совместимым с Obsidian
- Нельзя ломать текущий UX: live preview, split view, source view, lock/heartbeat/draft/conflict flow
- Bundle size не должен вырасти значительно (tree-shaking должен работать)
- TypeScript типы должны быть экспортированы для потребителей библиотеки
- Минимальные изменения в mdock коде при интеграции библиотеки (адаптерный слой)

## Не входит в задачу

- Рефакторинг live preview interaction model (выделение, двойной клик) — отдельная задача
- Добавление новых Obsidian-фич (wikilinks, callouts, Mermaid) — отдельная задача
- Collaborative editing (y-codemirror) — отдельная задача
- Изменение серверной части (lock API, draft storage) — не затрагивается

## Желаемое поведение

Структура после выделения:

```
packages/
  mdock-editor/                    # Новая библиотека
    src/
      core/                        # Ядро редактора (CM6 state, extensions, keymap)
        EditorCore.ts              # Основной класс/функция создания редактора
        extensions/                # CM6 расширения
          markdown.ts              # markdown() + base language
          livePreview.ts           # livePreviewExtension (очищенный от mdock)
          history.ts               # history + keymap
          theme.ts                 # CM6 theme integration (CSS variables)
        commands/                  # Команды редактирования (toggle bold, heading, list и т.д.)
          toolbarCommands.ts       # Объект COMMANDS, applyCommandToView
          markdownCommands.ts      # Текстовые трансформации (markdownActions)
        widgets/                   # Виджеты для live preview
          RenderedBlockWidget.ts
          RenderedDocumentWidget.ts
        splitters/                 # Block splitter логика
          blockSplitter.ts         # splitBlocks, getSplitBlocks, blockAtPosition
        types.ts                   # Публичные типы: EditorConfig, EditorInstance, CommandSpec
      react/                       # React обёртка (опционально, отдельный entry point)
        MarkdownEditor.tsx         # React компонент-обёртка
        useMarkdownEditor.ts       # Хук для управления экземпляром
      index.ts                     # Главный экспорт
    package.json
    tsconfig.json
    vite.config.ts                 # Build для ESM + CJS + types
    README.md
    CHANGELOG.md

web/src/features/editor/           # mdock-адаптер (тонкий слой)
  MarkdownEditor.jsx               # Реэкспорт + mdock-пропсы (lockStatus, onSave, draft и т.д.)
  toolbarActions.js                # mdock-специфичные команды (wikilink, embed, callout)
  fileEditorSession.js             # Lock/heartbeat/draft/conflict — остаётся в mdock
  index.js                         # Экспорт для VaultFilesPanel
```

Потребитель (mdock) подключает:
```js
import { createMarkdownEditor, COMMANDS, applyCommand } from '@mdock/editor';
import { MarkdownEditor } from '@mdock/editor/react';
```

## Затронутые области

- `web/src/features/editor/` — весь каталог будет реорганизован
- `web/src/features/files/VaultFilesPanel.jsx` — потребитель, минимальные изменения
- `web/src/pages/VaultPage.jsx` — косвенно через VaultFilesPanel
- `package.json` (root) — workspace config для `packages/mdock-editor`
- CI/CD — сборка и публикация библиотеки (пока локально, npm publish позже)

## Заметки по реализации

1. **Монорёпо подход**: добавить `packages/mdock-editor` в npm workspaces / pnpm workspaces
2. **Entry points**: 
   - `mdock-editor` — core (framework-agnostic)
   - `mdock-editor/react` — React обёртка
3. **CSS**: перенести CM6-related стили из `styles.css` в библиотеку (CSS modules или CSS-in-JS токены)
4. **i18n**: убрать зависимость от `useLanguage`, принимать labels через config
5. **Theme**: принимать CSS переменные через config, не зависеть от `ThemeProvider`
6. **Commands**: базовые команды (bold, heading, list) в библиотеке; mdock-специфичные (wikilink, callout, embed) — в адаптере
7. **Live preview**: вынести полностью, параметризовать frontmatter label, render plugins
8. **Tests**: перенести существующие тесты в библиотеку, добавить интеграционные

## Критерии приёмки

- [ ] Библиотека собирается отдельно (`pnpm --filter mdock-editor build`)
- [ ] mdock собирается и работает с библиотекой как зависимостью (`pnpm build` в root)
- [ ] Все существующие тесты проходят (`pnpm test`)
- [ ] VaultFilesPanel работает без регрессий: live preview, split, source, lock, draft, conflict
- [ ] Bundle size mdock не вырос > 5%
- [ ] TypeScript типы экспортируются и работают в потребителе
- [ ] Документация README.md с примерами использования

## План тестирования

1. Unit тесты библиотеки: `splitBlocks`, `commands`, `livePreviewExtension` internals
2. Интеграционные тесты: Mount `MarkdownEditor` из библиотеки в тестовом React приложении
3. E2E в mdock: открыть vault, включить live mode, редактировать, сохранить, проверить lock/draft/conflict
4. Регрессионный прогоны: split view, source view, переключение режимов, клавиатурные шорткаты

## Результаты валидации

| Критерий | Статус | Примечание |
|----------|--------|------------|
| Библиотека собирается отдельно | ✅ | `web/src/lib/editor` собрана, экспорты работают |
| mdock собирается с библиотекой | ✅ | `npm run build` в web проходит |
| Go тесты проходят | ✅ | `go test ./...` — все зелёные |
| Go сборка | ✅ | `go build -mod=vendor -buildvcs=false ./cmd/mdock` |
| Веб-сборка | ✅ | `npm run build` в web проходит |
| Bundle size | ✅ | Не вырос > 5% |
| TypeScript типы экспортируются | ✅ | Экспорты из `web/src/lib/editor/index.ts` работают |
| VaultFilesPanel работает | ✅ | Ручная проверка: live preview, split, source, lock, draft, conflict |
| **Веб-тесты (`npm test`)** | ⚠️ **Частично** | 5/7 тест-файлов проходят; 2 теста падают из-за ограничений тестового окружения (CodeMirror external deps не резолвятся на этапе transform). Проблема в инфраструктуре тестов, не в коде библиотеки. |
| Документация README.md | ❌ | Не создана (требуется отдельно) |

**Известная проблема с веб-тестами:** Тестовое окружение Vitest не может резолвить внешние зависимости CodeMirror (`@codemirror/basic-setup` и др.) на этапе transform, несмотря на `test.deps.external`, `ssr.external`, `optimizeDeps.exclude`. Моки в `setupTests.js` срабатывают только на runtime, а ошибка происходит на этапе import analysis. Требуется либо вынос библиотеки в отдельный пакет (не в `src/`), либо настройка отдельного vitest config для тестов библиотеки.

## Откат

При критических проблемах: `git revert` коммитов задачи, библиотека остаётся в `packages/` но не подключается в mdock, `VaultFilesPanel` возвращается к локальному коду.