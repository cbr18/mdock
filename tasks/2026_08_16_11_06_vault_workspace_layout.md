# Vault workspace layout

Status: DONE
Created: 2026-08-16 11:06
Project: mdock
Plan: [16_08_2026_11_06_vault_workspace_layout.md](../plans/16_08_2026_11_06_vault_workspace_layout.md)

## Проблема

Страница `page=vault` смешивает файловый просмотрщик, настройки vault, участников, git status, remote и commits в одной grid-сетке. Из-за этого просмотрщик занимает мало полезной ширины, документ визуально плохо отделён от chrome, а настройки выглядят частью редактора.

## Доказательства

- `VaultFilesPanel` сейчас находится внутри общей `dashboard-grid`.
- `dashboard-grid` строит карточки рядом, поэтому editor/preview не получает широкую рабочую область.
- Нет отдельного режима split preview/plain, хотя он нужен как базовый режим редактора.
- Переключатель языка визуально отличается от кнопки темы: язык выглядит как скруглённая pill-кнопка, тема как квадратная icon-кнопка.

## Нефункциональные ограничения

- Сохранять глобальную theme-token систему.
- Не добавлять новый роутер или UI framework.
- Не начинать полноценный CodeMirror editor/save flow в этой задаче.
- File API не должен вызываться для archived vault.
- Layout должен работать на desktop/mobile без горизонтального overflow.

## Не входит в задачу

- Сохранение plain/editor содержимого.
- File locks/heartbeat для веб-редактора.
- Wikilinks/backlinks/embeds/mermaid.
- Смена markdown-rendering библиотеки.

## Желаемое поведение

- Внутри vault есть отдельные вкладки/режимы: рабочая область editor/viewer и настройки/status.
- Editor/viewer занимает широкую полезную область страницы.
- Файлы остаются слева.
- Документ визуально отделён: понятно, где начинается markdown-документ.
- На странице editor/viewer есть кнопка режима: rendered, plain, split.
- Split показывает rendered и plain одновременно в двух колонках.
- Settings/status page содержит metadata, members, Git status, remote и commits отдельно от editor/viewer.
- Переключатели темы и языка выглядят согласованно.

## Затронутые области

- `web/src/pages/VaultPage.jsx`
- `web/src/features/files/`
- `web/src/features/i18n/LanguageProvider.jsx`
- `web/src/styles.css`
- frontend tests

## Заметки по реализации

- Не создавать отдельный URL для вложенных вкладок на первом шаге; state внутри `VaultPage` достаточно для MVP.
- `VaultFilesPanel` должен стать workspace component и принимать mode state либо держать его внутри себя.
- Plain mode пока readonly `<pre>`, полноценный editor позже.

## Критерии приёмки

- Vault editor/viewer и settings/status визуально разделены.
- На editor/viewer файлы слева, документ справа, рабочая область шире текущей.
- Rendered/plain/split переключаются без перезагрузки файла.
- Settings/status доступны отдельной вкладкой внутри vault.
- Theme/language controls выглядят согласованно.
- Tests/build проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- Playwright/manual smoke: открыть vault, открыть markdown, переключить rendered/plain/split, перейти в settings/status, вернуться назад.

## Результаты валидации

- `npm test` в `web/` — passed, 8 tests.
- `npm run build` в `web/` — passed, есть warning Vite по chunk > 500 KB из-за markdown/highlight зависимостей.
- `go test ./...` — passed.
- `go test -count=1 -tags smoke ./test/smoke` против clean stack на `127.0.0.1:18081` — passed.
- Playwright smoke: login, vault editor tab, rendered preview, split mode, settings tab.

## Откат

Откатить layout/components/styles changes. Backend и данные vault не трогать.
