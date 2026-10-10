# План реализации: Выделение редактора в локальную библиотеку (внутри репо)

**Task:** [2026_10_07_15_45_extract_editor_to_library.md](../tasks/2026_10_07_15_45_extract_editor_to_library.md)

**Ветка:** `feat/editor-library`

---

## Последовательность реализации

### Фаза 0: Подготовка структуры (0.5 дня)

1. **Создать структуру локальной библиотеки** в `web/src/lib/editor/`
   ```
   web/src/lib/editor/
   ├── core/
   │   ├── splitters/
   │   ├── commands/
   │   ├── widgets/
   │   ├── extensions/
   │   └── index.ts
   ├── react/
   │   ├── MarkdownEditor.tsx
   │   ├── useMarkdownEditor.ts
   │   └── index.ts
   ├── styles.css
   ├── index.ts                 # Core exports
   └── package.json             # Только для типов/скриптов, не паблиш
   ```
   - Не нужен отдельный `package.json` с `name` — это внутренняя библиотека
   - Импорты через path alias: `@mdock/editor` → `web/src/lib/editor`
   - Добавить alias в `vite.config.js` и `tsconfig.json`

2. **Настроить Vite alias и TS path mapping**
   - `web/vite.config.js`: `resolve.alias: { '@mdock/editor': '/src/lib/editor' }`
   - `web/tsconfig.json` (или `jsconfig.json`): `compilerOptions.paths: { "@mdock/editor/*": ["src/lib/editor/*"] }`

3. **Перенести общие типы** в `web/src/lib/editor/core/types.ts`

### Фаза 1: Извлечение Core (2 дня)

#### 1.1 Block Splitter (`web/src/lib/editor/core/splitters/blockSplitter.ts`)
- Перенести: `splitBlocks`, `getSplitBlocks`, `blockAtPosition`, `createBlock`, `absorbSeparators`, `trimTrailingBlank`
- Перенести все `is*` предикаты: `isBlank`, `isFenceStart`, `isAtxHeading`, `isSetextUnderline`, `isThematicBreak`, `isBlockquoteLine`, `isListLine`, `isListContinuation`, `isTableStart`, `isTableRow`, `isTableDelimiter`
- Экспортировать: `SplitBlock`, `BlockType` типы
- Убрать: кэш `splitBlocksCache` (сделать опциональным через config)

#### 1.2 Commands (`web/src/lib/editor/core/commands/`)
- `toolbarCommands.ts`: `COMMANDS` объект, `applyCommandToView`, `initialFormValues`, `PARAM_LABEL_KEYS`
- `markdownCommands.ts`: функции из `markdownActions.js` (`toggleMark`, `wrapSelection`, `toggleBlockPrefix`, `toggleList`, `indentList`, `outdentList`, `insertTable`, `insertFootnote`, `insertMetadata`)
- Сделать `COMMANDS` расширяемым: принимать `customCommands` в конфиге
- Убрать mdock-специфичные команды: `wikilink`, `embed`, `callout`, `metadata` → оставить в адаптере

#### 1.3 Widgets (`web/src/lib/editor/core/widgets/`)
- `RenderedBlockWidget.ts` — класс виджета для одного блока
- `RenderedDocumentWidget.ts` — виджет для всего документа (fallback)
- Перенести: `cursorPositionFromClick`, `activeBlockRange`, `isActiveBlock`, `rangesIntersect`
- **Критично**: параметризовать `renderContent` — принимать `renderPlugins` (remark/rehype plugins) через конфиг
- Убрать захардкоженный `ReactMarkdown` import — принимать renderer factory

#### 1.4 Live Preview Extension (`web/src/lib/editor/core/extensions/livePreview.ts`)
- Перенести всю логику из `livePreviewExtension.js`
- Экспортировать: `livePreviewExtension(config)` фабрику
- Config интерфейс:
  ```ts
  interface LivePreviewConfig {
    frontmatterLabel: string;
    renderPlugins?: { remark?: any[]; rehype?: any[] };
    blockSplitter?: BlockSplitterFn;
    widgets?: { block?: WidgetType; document?: WidgetType };
    keymap?: KeymapBinding[];
    onBlockActivate?: (block: SplitBlock) => void;
  }
  ```
- Убрать захардкоженные `markdownRemarkPlugins`, `markdownRehypePlugins` import

#### 1.5 Theme Extension (`web/src/lib/editor/core/extensions/theme.ts`)
- Вынести CM6 theme стили из `web/src/styles.css` (секции `.cm-live-preview`, `.cm-live-*`, `.cm-live-rendered-*`)
- Создать `createEditorTheme(cssVariables: CSSVariableMap)` фабрику
- CSS переменные: `--markdown-font-size`, `--markdown-code-font-size`, `--radius-sm`, цвета через `color-mix`

#### 1.6 Core Entry Point (`web/src/lib/editor/core/index.ts`)
- Экспортировать: `createEditor(config)`, `EditorInstance`, `EditorConfig`
- `EditorConfig`:
  ```ts
  interface EditorConfig {
    value: string;
    readOnly?: boolean;
    extensions?: Extension[];
    livePreview?: LivePreviewConfig | false;
    theme?: Extension;
    keymap?: KeymapBinding[];
    onChange?: (value: string) => void;
    onSelectionChange?: (selection: EditorSelection) => void;
  }
  ```
- `EditorInstance`: `{ view: EditorView; update: (value: string) => void; destroy: () => void }`

### Фаза 2: React Wrapper (1 день)

#### 2.1 `web/src/lib/editor/react/MarkdownEditor.tsx`
- Тонкая обёртка над `createEditor` + `useEffect` для lifecycle
- Пропсы: `value`, `onChange`, `readOnly`, `variant: 'source' | 'live' | 'split'`, `livePreviewConfig`, `toolbarConfig`
- **Не включать** тулбар в библиотеку — тулбар = потребительская ответственность
- Экспортировать `useMarkdownEditor` хук для императивного управления

#### 2.2 `web/src/lib/editor/react/index.ts`
- Экспорт: `MarkdownEditor`, `useMarkdownEditor`, `EditorToolbar` (опциональный базовый тулбар как пример)

### Фаза 3: Стили и ассеты (0.5 дня)

#### 3.1 CSS
- Создать `web/src/lib/editor/styles.css` с CM6-специфичными стилями
- Использовать CSS custom properties для темизации
- Импортировать в `web/src/main.jsx` или через `@mdock/editor/styles.css`

#### 3.2 Fonts / Icons
- Не бандлить иконки (lucide-react) — peer dependency (уже в проекте)
- Документировать необходимые CSS переменные в README

### Фаза 4: Адаптер для mdock (1.5 дня)

#### 4.1 Обновить `web/src/features/editor/`
- `MarkdownEditor.jsx` → реэкспорт из `@mdock/editor/react` + mdock-пропсы
- `toolbarActions.js` → оставить mdock-специфичные команды, базовые — реэкспорт из библиотеки
- `livePreviewExtension.js` → **удалить**, использовать библиотечную версию с mdock config
- `markdownActions.js` → реэкспорт базовых из библиотеки, оставить специфичные
- `fileEditorSession.js` → не трогать (lock/heartbeat/draft/conflict — mdock domain)

#### 4.2 Конфигурация mdock для библиотеки
Создать `web/src/features/editor/mdockEditorConfig.js`:
```js
import { livePreviewExtension } from '@mdock/editor';
import { markdownRemarkPlugins, markdownRehypePlugins, splitFrontmatter } from '../files/MarkdownPreview.jsx';

export const mdockLivePreviewConfig = {
  frontmatterLabel: 'Frontmatter', // i18n через пропс
  renderPlugins: {
    remark: markdownRemarkPlugins,
    rehype: markdownRehypePlugins
  },
  // mdock-специфичные команды добавляются через toolbarConfig
};
```

#### 4.3 Обновить `VaultFilesPanel.jsx`
- Импорт: `import { MarkdownEditor } from '@mdock/editor/react'`
- Передать `livePreviewConfig={mdockLivePreviewConfig}`
- Тулбар: собрать из базовых команд библиотеки + mdock команд

### Фаза 5: Тесты и сборка (1 день)

#### 5.1 Перенести тесты в библиотеку
- `web/src/lib/editor/tests/blockSplitter.test.ts`
- `web/src/lib/editor/tests/commands.test.ts`
- `web/src/lib/editor/tests/livePreviewExtension.test.ts`
- Обновить импорты, моки

#### 5.2 Интеграционные тесты
- `web/src/lib/editor/tests/integration/MarkdownEditor.test.tsx` — mount React wrapper
- Проверить: live preview активация, split view, source view

#### 5.3 Запуск в mdock
- `pnpm test` — все существующие тесты проходят
- `pnpm build` — production build работает
- Ручное тестирование: VaultFilesPanel все режимы

### Фаза 6: Документация и полировка (0.5 дня)

- `web/src/lib/editor/README.md`: архитектура, API reference, примеры интеграции
- `CHANGELOG.md` в корне репо с записью о выделении библиотеки
- Обновить `docs/tech-stack.md` с описанием локальной библиотеки

---

## Проверки

| Этап | Проверка | Команда |
|------|----------|---------|
| 0 | Alias работает, импорты резолвятся | `pnpm run typecheck` (или `tsc --noEmit`) |
| 1 | Core тесты проходят | `pnpm test -- web/src/lib/editor/core` |
| 2 | React wrapper работает в изоляции | `pnpm test -- web/src/lib/editor/react` |
| 3 | CSS импортируется без ошибок | `pnpm build` |
| 4 | mdock собирается с библиотекой | `pnpm build` (root) |
| 4 | Все mdock тесты проходят | `pnpm test` (root) |
| 4 | Ручное: live preview, split, source, lock, draft, conflict | Открыть `http://127.0.0.1:18081` |
| 5 | Bundle size не вырос > 5% | `pnpm build && npx bundle-analyzer` |

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| CSS переменные конфликтуют с mdock theme | Среднее | Высокое | Префикс `--mdock-editor-*`, документация required variables |
| Vite alias не резолвится в тестах | Низкое | Среднее | Настроить `vitest.config.js` с тем же alias |
| Live preview виджеты теряют контекст view | Среднее | Высокое | Unit тесты для `cursorPositionFromClick`, `blockAtPosition` |
| Bundle size вырос из-за дублирования CM6 | Низкое | Среднее | Проверить `pnpm why @codemirror/state` — должен быть 1 копия |
| i18n в тулбаре сломается | Среднее | Низкое | Labels через config, mdock-адаптер передаёт `t()` значения |
| TypeScript типы не экспортируются корректно | Низкое | Высокое | `tsc --noEmit` в CI, тест потребителя в mdock |

---

## Заметки по откату

1. **Полный откат**: `git revert` всех коммитов задачи → `web/src/lib/editor` остаётся, но не используется в mdock
2. **Частичный откат (только адаптер)**: Вернуть `web/src/features/editor/*` локальные версии, оставить библиотеку для будущего использования
3. **Быстрый фикс**: Если сборка ломается — временно скопировать исходники обратно в `web/src/features/editor/` как `vendor/`

---

## Параллелизуемые работы

- Фаза 1 (Core) и Фаза 3 (Styles) — независимы
- Фаза 2 (React) может начаться после завершения Core API (интерфейсы стабильны)
- Фаза 4 (Адаптер) — после успешной сборки библиотеки (Фаза 0-3)
- Тесты (Фаза 5) — параллельно с реализацией каждого модуля