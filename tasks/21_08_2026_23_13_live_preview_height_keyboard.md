# Live Preview Height And Keyboard Navigation

Status: DONE
Created: 2026-08-21 23:13
Reopened: 2026-08-21 23:58
Project: mdock
Plan: [21_08_2026_23_13_live_preview_height_keyboard.md](../plans/21_08_2026_23_13_live_preview_height_keyboard.md)

## Проблема

В live editor блоки выглядят лучше, но высоты/отступы неровные, а навигация клавиатурой работает некорректно: `ArrowDown` сдвигает курсор на одну строку, а `ArrowUp` переносит в начало документа.

После проверки пользовательских скриншотов задача переоткрыта: live editor всё ещё не совпадает с режимом `Просмотр` по ширине, левому краю, вертикальному ритму и первичному отображению frontmatter.

## Доказательства

- Пользователь проверил running UI и сообщил о неровной высоте и неправильной навигации `ArrowUp`.
- Текущий live preview использует rendered block widgets, из-за чего стандартная визуальная навигация CodeMirror может опираться на геометрию widgets.
- Скриншоты пользователя:
  - `скрины/просмотр.png`
  - `скрины/редактирование.png`
- По скриншотам видно:
  - live edit смещён правее и занимает меньшую полезную ширину, чем `Просмотр`;
  - frontmatter при открытии показывается как raw Markdown, а не как metadata block;
  - между блоками есть лишние вертикальные провалы;
  - quote/list/table/code визуально выше или уже, чем в `Просмотр`;
  - таблица и code block не совпадают по ширине с обычным preview.

## Нефункциональные ограничения

- Не менять backend/API.
- Не менять поведение `Исходник` и `Две панели`.
- Не добавлять зависимости.
- Не трогать чужие untracked/debug файлы и package changes в рабочей копии.
- Сохранять rendered preview подход для live preview.

## Не входит в задачу

- Полный Obsidian parser.
- Cell-level table editor.
- Переработка всей темы редактора.
- Push/deploy.

## Желаемое поведение

- Rendered blocks в live editor стоят ровно в документном потоке без лишних вертикальных провалов.
- Source lines и active source line имеют стабильный базовый line-height.
- Live edit совпадает с `Просмотр` по левому краю, ширине контента и базовым отступам.
- При первом открытии документа frontmatter отображается как metadata block, а не как активный raw source block.
- Quote, списки, task lists, таблицы и code blocks в live edit используют те же размеры, паддинги и визуальный ритм, что и `Просмотр`.
- `ArrowDown` двигает курсор на следующую Markdown-строку.
- `ArrowUp` двигает курсор на предыдущую Markdown-строку, а не в начало документа.
- Горизонтальная позиция курсора по возможности сохраняется.

## Затронутые области

- `web/src/features/editor/livePreviewExtension.js`
- `web/src/styles.css`
- `web/src/App.test.jsx`

## Заметки по реализации

- Добавить `keymap.of` в `livePreviewExtension`.
- Реализовать custom commands для `ArrowUp`/`ArrowDown` через `state.doc.lineAt`.
- Навигация должна работать по логическим Markdown-строкам, потому что rendered widgets ломают визуальную геометрию.
- Сжать CSS margins внутри `.cm-live-rendered-block`, чтобы rendered preview был ровнее в CodeMirror-потоке.
- Почему Playwright не поймал регресс:
  - была проверена функциональная часть: наличие rendered DOM-блоков, распознавание таблицы, базовая навигация `ArrowUp`/`ArrowDown`;
  - не было сравнения скриншотов `Просмотр` и `Редактирование`;
  - не было assertions по `boundingBox` для левого края, ширины, высоты и вертикальных расстояний однотипных Markdown-блоков;
  - не проверялось стартовое состояние документа до клика/фокуса, поэтому raw frontmatter на первом экране не был пойман как дефект.
- Что доделать конкретно:
  - добавить Playwright-проверку визуального паритета: открыть один и тот же файл в `Просмотр` и live edit, собрать `boundingBox` для heading, frontmatter, paragraph, blockquote, list, table, code и сравнить левый край/ширину/вертикальные интервалы с допуском;
  - сделать стартовое состояние live edit неактивным для rendered-блоков: raw source показывать только после явного клика/фокуса на конкретный блок, а не из-за дефолтной CodeMirror-селекции в начале документа;
  - выровнять `.cm-content`, `.cm-live-rendered-block` и preview-контейнер по одной content width модели;
  - переиспользовать стили/компонент frontmatter из обычного preview для live edit;
  - убрать лишние blank-line провалы между block widgets или заменить их нулевыми placeholders;
  - привести quote/list/table/code styles к тем же margin/padding/border/width, что и в `.markdown-preview`;
  - после правок отдельно перепроверить `ArrowUp`/`ArrowDown`, чтобы decouple active block не сломал навигацию.
- Итоговая реализация:
  - когда активного raw-блока нет, live edit рендерит весь документ одним full-document preview widget, поэтому margins и поток совпадают с обычным `Просмотр`;
  - raw source включается только после явного клика по top-level Markdown-блоку;
  - скрытые `.cm-line` у заменённых блоков имеют нулевую высоту, чтобы CodeMirror не добавлял пустые строки;
  - rendered widget сбрасывает `white-space: pre-wrap` от CodeMirror обратно в `white-space: normal`;
  - live rendered content использует тот же пользовательский font-size, что и обычный preview, а metadata/code остаются компактными.

## Критерии приёмки

- Unit tests проверяют rendered live blocks.
- `npm test` и `npm run build` проходят.
- Test stack пересобран на `http://127.0.0.1:18081`.
- Playwright проверяет не только наличие rendered blocks, но и визуальный паритет с режимом `Просмотр`.
- Bounding boxes live edit и `Просмотр` совпадают по левому краю и ширине с допуском до 8px.
- Вертикальные интервалы между однотипными блоками отличаются от `Просмотр` не больше чем на 8-12px.
- При первом открытии live edit frontmatter отображается как metadata block.
- Quote/list/table/code в live edit визуально совпадают с `Просмотр` по ширине и компактности.
- `ArrowUp`/`ArrowDown` двигают курсор по одной логической Markdown-строке и не прыгают в начало документа.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP ручная проверка live editor.
- Playwright visual parity check:
  - открыть `http://127.0.0.1:18081/?page=vault&slug=admin`;
  - открыть один Markdown-файл в `Просмотр`;
  - снять скриншот и bounding boxes для frontmatter/heading/paragraph/quote/list/table/code;
  - включить `Редактирование`, остаться в live edit;
  - снять второй скриншот и bounding boxes;
  - сравнить ширину, левый край и вертикальные интервалы с допусками из критериев приёмки.

## Результаты валидации

- Ранее выполненная валидация признана неполной: она проверяла функциональные признаки live blocks и клавиатуру, но не проверяла визуальный паритет с `Просмотр`.
- Ранее: `npm test -- src/App.test.jsx src/features/editor/markdownActions.test.js src/features/editor/fileEditorSession.test.js` — passed, 3 files / 22 tests.
- Ранее: `npm run build` — passed.
- Ранее: `go test ./...` — passed.
- Ранее: `cd test && docker compose up -d --build` — passed, only test stack started.
- Ранее: `./test/run-smoke.sh` — passed.
- Ранее: `docker ps` — only `mdock:test` is running on `http://127.0.0.1:18081`.
- Ранее: Playwright MCP manual check — partial pass: baseline source line height is 24px, table is recognized as rendered table, `ArrowDown` moves from heading to next Markdown block, `ArrowUp` returns to heading instead of document start.
- После удаления debug specs полный `npm test` проходил, но задача переоткрыта из-за визуального регресса по пользовательским скриншотам.
- Commit: `1c659f4`.
- Commit: `51fc3a2`.
- `npm test` — passed, 3 files / 22 tests.
- `npm run build` — passed.
- `go test ./...` — passed.
- `cd test && docker compose up -d --build` — passed, only test stack rebuilt.
- `./test/run-smoke.sh` — passed.
- Playwright MCP visual parity check на `http://127.0.0.1:18081/?page=vault&slug=admin&view=rendered`:
  - `frontmatter`: `dx=0`, `dy=0`, `dw=0`, `dh=3`;
  - `h1`: `dx=0`, `dy=4`, `dw=0`, `dh=0`;
  - `paragraph`: `dx=0`, `dy=3`, `dw=0`, `dh=0`;
  - `quote`: `dx=0`, `dy=3`, `dw=0`, `dh=0`;
  - `list`: `dx=0`, `dy=3`, `dw=0`, `dh=0`;
  - `table`: `dx=0`, `dy=3`, `dw=0`, `dh=0`;
  - `code`: `dx=0`, `dy=5`, `dw=0`, `dh=2`.
- Playwright MCP стартовое состояние live edit: `activeLines=0`, `renderedBlocks=1`, `rawFrontmatterVisible=false`.
- Playwright MCP клик по rendered paragraph: `activeLines=1`, `renderedBlocks=7`, `rawParagraphVisible=true`, `rawFrontmatterVisible=false`.
- Доп. проверка размера Markdown: `--markdown-font-size=16px`; `tags: [e2e]` в `Просмотр` и live edit имеет `fontSize=16px`, `lineHeight=25.92px`; `sameFrontmatterFontSize=true`, `sameArticleFontSize=true`.

## Откат

Откатить keymap live navigation и CSS adjustments этой задачи.
