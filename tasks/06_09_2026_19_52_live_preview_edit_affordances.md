# Live preview edit affordances fix

Status: DONE
Created: 2026-09-06 19:52
Project: mdock
Plan: [06_09_2026_19_52_live_preview_edit_affordances.md](../plans/06_09_2026_19_52_live_preview_edit_affordances.md)

## Проблема

В live edit (режим "Просмотр" с включенной галкой "Редактирование") пользователь не мог нормально печатать: набираемый текст уходил в скрытый source, активная строка не появлялась, Enter казался мертвым, а тулбар отсутствовал.

Дополнительно: выпадающие панели тулбара (меню/формы) при открытии оказывались под редактором / вне видимой области в live-режиме — попап обрезался `overflow: hidden` оболочки редактора или вылезал за viewport.

## Доказательства

Playwright на http://127.0.0.1:18081 (файл Obsidian Vault/hello.md, live view=rendered):

- до фикса: active lines 0; после ввода без клика content содержит ALPHA: false; toolbar count 1, visible false;
- после фикса: content содержит ALPHA: true; active lines 1; toolbar visible: true.

## Нефункциональные ограничения

- Не ломать явный клик по rendered-блоку: активация по клику сохраняется.
- Не менять backend, save и lock flow.
- Не вводить новые зависимости.
- Изменения только в web-части и документации.

## Не входит в задачу

- Полный Obsidian-парсер.
- Enter как начало нового абзаца (blank line между блоками).
- Массовая переработка live preview.

## Желаемое поведение

- Тулбар виден в live-режиме.
- При наборе без активного блока строка под кареткой активируется.
- Enter дает видимую новую строку в активном блоке.
- Активация блока согласована: клик, набор, команды тулбара.

## Затронутые области

- web/src/features/editor/livePreviewExtension.js
- web/src/styles.css
- web/src/features/editor/livePreviewExtension.test.js
- tasks/ plans/

## Заметки по реализации

- В update StateField: при docChanged и isUserEvent('input') без активного блока вычислять blockAtPosition(transaction.state, selection.main.head) и активировать его.
- Добавить helper blockAtPosition и экспорт в __livePreviewInternals.
- В styles.css заменить .live-document-view .editor-toolbar display none на display flex.
- Попапы тулбара рендерятся через createPortal в document.body с position: fixed по координатам кнопки (вычисление в handleToggle синхронно + update по scroll/resize). Это убирает обрезание overflow: hidden независимо от родительского контейнера.
- .toolbar-popover больше не использует position absolute/top/left из CSS (координаты задаются inline).

## Критерии приёмки

- npm test проходит (40/40).
- npm run build проходит.
- Playwright в live-режиме: тулбар виден, печать активирует строку, Enter дает новую строку, команды тулбара применяются.
- ./test/run-smoke.sh проходит.

## План тестирования

- npm test
- npm run build
- cd test && docker compose up -d --build
- Playwright-сценарии в /tmp/mdock-pw: repro-live.js, repro-live2.js, repro-live-toolbar.js.

## Результаты валидации

- npm test: 6 файлов / 40 тестов passed.
- npm run build: passed.
- Repro1: тулбар visible, клик активирует строку, ввод и Enter работают.
- Repro2: ввод без клика — активных строк 1, контент содержит ALPHA.
- Repro-toolbar: heading2 и link применяются в live-режиме.
- Repro-popover: попап в live-режиме рендерится через портал, box `x=629 y=457 w=300 h=350`, полностью внутри viewport; команды из попапа применяются.
- До фикса попапа box был `x=0 y=1036 width=1440` — попап оказывался вне viewport (под редактором).
- ./test/run-smoke.sh: ok.

## Commits

- Не создано: изменения подготовлены локально.

## Откат

- Вернуть display none для .live-document-view .editor-toolbar.
- Убрать blockAtPosition и условие в update.
- Удалить тесты для blockAtPosition.
- Вернуть попап в inline-рендеринг (chil в .toolbar-menu) вместо портала при необходимости.