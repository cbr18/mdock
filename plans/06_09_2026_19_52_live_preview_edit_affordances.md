# Live preview edit affordances fix

Task: [06_09_2026_19_52_live_preview_edit_affordances.md](../tasks/06_09_2026_19_52_live_preview_edit_affordances.md)

## Последовательность реализации

1. Воспроизвести проблему Playwright в live-режиме (тулбар скрыт, ввод уходит в скрытый source, Enter без эффекта).
2. В livePreviewExtension.js добавить активацию блока при наборе без активного блока: blockAtPosition(transaction.state, head) при docChanged и isUserEvent('input').
3. Экспортировать helper в __livePreviewInternals.
4. В styles.css показывать .live-document-view .editor-toolbar (display flex вместо none).
5. Рендерить .toolbar-popover через createPortal в document.body с position: fixed по координатам кнопки (синхронный compute в handleToggle + обновление по scroll/resize), убрав absolute-позиционирование из CSS.
6. Добавить unit-тесты для blockAtPosition.
7. Прогнать npm test и npm run build.
8. Пересобрать контейнер в test/ и проверить Playwright-сценариями.
9. Обновить task и roadmap.

## Проверки

- npm test
- npm run build
- cd test && docker compose up -d --build
- Playwright: repro-live.js, repro-live2.js, repro-live-toolbar.js
- ./test/run-smoke.sh

## Риски

- Активация блока при любом input может мешать автозаменам/undo. Ограничение: только если активного блока нет.
- Показ тулбара в live-режиме меняет высоту оболочки редактора; проверяется Playwright.
- isUserEvent('input') на больших вставках через toolbar тоже активирует блок — ожидаемо и желательно.
- Портал-попап: координаты могут устареть при скролле, поэтому добавить пересчёт на scroll/resize (capture); при закрытии меню убрать портал.

## Заметки по откату

- Вернуть display none в styles.css.
- Убрать blockAtPosition и условие в update, вернуть тесты к прежнему виду.
- Вернуть .toolbar-popover к inline-рендерингу внутри .toolbar-menu (без портала), если понадобится.