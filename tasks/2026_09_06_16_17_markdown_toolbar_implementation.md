# Markdown toolbar implementation

Status: DONE
Created: 2026-09-06 16:17
Project: mdock
Plan: [06_09_2026_16_17_markdown_toolbar_implementation.md](../plans/06_09_2026_16_17_markdown_toolbar_implementation.md)

## Проблема

В `web/src/features/editor/MarkdownEditor.jsx` тулбар свёрстан и сгруппирован, но все кнопки-команды — заглушки: `ToolbarButton` всегда `disabled` и подписан `notImplementedYet`. Текстовые трансформации уже реализованы в `markdownActions.js` и покрыты тестами, но не подключены к CodeMirror view. Дорожка roadmap `15` Markdown toolbar implementation требует, чтобы команды тулбара выполнялись и генерировали совместимый с Obsidian Markdown.

## Доказательства

- `MarkdownEditor.jsx:146` — `ToolbarButton` рендерит `disabled` + `notImplementedYet`, без пропсов действия.
- `docs/roadmap.md` — пункт `15` Markdown toolbar implementation помечен как следующая задача.
- `docs/markdown-editor-requirements.md` — таблица команд MVP и группы тулбара, `Toolbar commands must operate only on current selection or current block`.
- `markdownActions.js` — трансформации уже есть и покрыты `markdownActions.test.js`.
- i18n-ключи для кнопок уже есть в `LanguageProvider.jsx` (ru/en).

## Нефункциональные ограничения

- Команды остаются чистыми текстовыми трансформациями без WYSIWYG-сериализации; итоговый артефакт — plain UTF-8 Markdown `.md`.
- Не ломать byte-for-byte незнакомый синтаксис вне цели команды.
- Не менять backend, lock/save lifecycle и существующий flow сохранения (`PUT /api/vaults/{slug}/files/content`).
- Не вводить новые зависимости.
- Все новые user-facing строки — в оба языка (ru и en) одним изменением.
- Сохранять существующий внешний вид/классы тулбара; минимальные стилевые правки только при необходимости для работающих popover-форм.
- Изменения ограничиваются `web/` и документацией: `tasks/`, `plans/`, `docs/roadmap.md`.

## Не входит в задачу

- WYSIWYG/rich-text редактирование.
- Preview-плагины (Mermaid, MathJax/KaTeX, callout rendering, backlinks, wikilinks preview).
- Конфликт-recovery UI (`16` в roadmap) и Lock-lost UI.
- Attachment upload/preview (`17` в roadmap).
- Запись `id` для block references и индекс headings (помеченные `later` команды из requirements).
- Правки backend API.

## Желаемое поведение

- Каждая кнопка тулбара применяет соответствующую трансформацию к текущему выделению/блоку в CodeMirror.
- После применения тулбара содержимое передаётся через существующий `onChange`, так что dirty-флаг, lock heartbeat и preview обновляются как при ручном вводе.
- Команды без параметров работают сразу; команды с параметрами (link, image, wikilink/alias, callout type, footnote, table size, metadata/frontmatter, code block language, heading) открывают компактные popover-формы с полями и кнопкой применения.
- Каретка/выделение после команды ставится осмысленно (внутри вставленного текста/label).
- Применение команды при отсутствии lock/readonly не ломает состояние: тулбар доступен только в режиме редактирования.
- Заглушки `notImplementedYet` исчезают для команд из MVP-таблицы requirements.
- `docs/roadmap.md` отмечает пункт `15` как выполненный или в работе по факту завершения.

## Затронутые области

- `web/src/features/editor/MarkdownEditor.jsx`
- `web/src/features/editor/markdownActions.js` (только если для диспатча нужны незначительные правки API)
- `web/src/features/editor/markdownActions.test.js`
- новый `web/src/features/editor/toolbarActions.jsx` (диспатчер на CodeMirror view + popover-формы, при необходимости)
- `web/src/features/i18n/LanguageProvider.jsx` (новые строки форм)
- `web/src/styles.css` (стили для popover-форм, при необходимости)
- `docs/roadmap.md`
- `tasks/`
- `plans/`

## Заметки по реализации

- Диспатчер: взять `EditorView` из `viewRef`, построить `changes`/`selection` на основе результата `markdownActions`, применить через `view.dispatch` и отдать обновлённый текст в `onChange` (аналогично тому, как CodeMirror `onChange` отдаёт итоговый `nextValue`).
- `markdownActions` возвращает `{ text, selectionStart, selectionEnd }` относительно старого текста; позицию каретки можно пересчитывать от `state.selection.main.head` на момент вызова.
- Не полагаться на двусторонний привязку значения: тулбар должен диспатчить через view и синхронизировать контракт `onChange`, иначе React-контрол условный value может перезаписать результат.
- Popover-формы переиспользуют паттерн `ToolbarMenu`/закрытие по `pointerdown` и `Escape`.
- Формы ввода: submit по Enter, кнопка Apply/Cancel.
- Для heading и code block language dropdown переиспользовать существующие i18n-ключи `heading1..6` и добавить маленький список языков (`plain`, `js`, `ts`, `md`, `json`, `yaml`, `css`).

## Критерии приёмки

- Все командные кнопки из MVP-таблицы `docs/markdown-editor-requirements.md` исполняют трансформацию при клике.
- Результат команды виден в editor и попадает в `onChange`/dirty/lock flow.
- Команды сохраняют незнакомый синтаксис вокруг цели.
- Popover-формы работают с клавиатуры (Enter/Escape), не закрываются случайным кликом вне.
- `npm test` зелёный (включая новые тесты на диспатч/поведение кнопок).
- `npm run build` проходит.
- Новые строки UI переведены на ru и en.

## План тестирования

- Unit: новые тесты на диспатчер тулбара (применение трансформации к view и контракт `onChange`).
- Unit: при необходимости дополнительные кейсы `markdownActions` для команд форм (callout, footnote, table, frontmatter).
- `npm test` — все тесты проходят.
- `npm run build` — сборка проходит.
- Ручная проверка в браузерном режиме editor (source и live) после пересборки контейнера: каждая группа тулбара применяет команду, каретка встаёт корректно, после save файл остаётся валидным Markdown.

## Результаты валидации

- Реализовано: `toolbarActions.js` (диспатчер `applyCommandToView` + карта команд `COMMANDS`), `MarkdownEditor.jsx` (живые кнопки, popover-формы через `ToolbarForm`), i18n-ключи ru/en, стили `.toolbar-form`.
- `npm test` — 37/37 passed.
- `npm run build` — passed.
- Новые тесты `toolbarActions.test.js` — 6/6 passed.
- Примечание: в этом окружении (Node v26 + vitest 4 + jsdom 27) глобальный `localStorage` маскируется node-экспериментальным undefined. Добавлен in-memory polyfill в `web/src/setupTests.js` (pre-existing тест-инфраструктурная проблема, не связанная с фичей); без него весь существующий App-сьют не запускается.
- Тестовый контейнер пересобран с `test/` (`docker compose up -d --build`, доступен `http://127.0.0.1:18081`).
- `./test/run-smoke.sh` — пройден. После правки скрипт больше не требует обходного запуска (см. правку ниже).
- Проверка editor API-цепочки с этого контейнера: login → create vault → PUT markdown-файл → lock → GET content — все 200.
- В новый контейнер попал бандл с тулбаром (проверено: `toolbar-form` и русские подписи присутствуют в `/usr/local/bin/mdock`).
- Playwright-проверка тулбара (chromium, `http://127.0.0.1:18081`, файл `Obsidian Vault/hello.md` в source mode) — все сценарии прошли:
  - inline: Жирный (`**…**`), Курсив (`*…*`), Зачёркнутый (`~~…~~`), Подсветка (`==…==`), Код в строке (`` `…` ``), Комментарий (`%%…%%`).
  - paragraph: Заголовок 2 (`## …`), снятие headings через Абзац.
  - lists: Маркированный список (`- `), Нумерованный (`1. `), Чеклист (`- [ ] `).
  - insert/form: Ссылка через popover-форму (`[Клик](https://example.com)`).
  - Save после трансформаций — сохранение работает.
- UX-правка, найденная при проверке: после применения команды тулбар-меню теперь закрывается (`setOpenMenu('')` в `runCommand` MarkdownEditor.jsx), чтобы повторный клик не сворачивал меню вхолостую.
- `npm test` (после финальных правок) — 37/37 passed, `npm run build` — passed.

## Commits

- Не создано: изменения подготовлены локально (коммиты по согласованию).

## Откат

- Откатить изменения `MarkdownEditor.jsx`, `toolbarActions` и стилей.
- Вернуть i18n-словари к прежнему виду (удалить новые ключи).
- Обновить `docs/roadmap.md`.
- Файл `06_09_2026_16_17_markdown_toolbar_implementation.md` из `tasks/` и `plans/` удалить при полном откате.