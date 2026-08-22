# File tree explorer mode

Status: DONE
Created: 2026-08-22 11:08
Project: mdock
Plan: [22_08_2026_11_08_file_tree_explorer_mode.md](../plans/22_08_2026_11_08_file_tree_explorer_mode.md)

## Проблема

Панель файлов сейчас работает как листинг текущей папки: при открытии папки список заменяется содержимым этой папки. Пользователь хочет поведение ближе к проводнику: папки должны раскрываться внутри дерева.

## Доказательства

Пользователь спросил: "а чтобы они как в проводнике открывались можно? ну дерево собственно".

## Нефункциональные ограничения

- Не менять backend contract.
- Использовать существующий `listFiles`, `createFile`, `createDirectory`, `deletePath`.
- Не реализовывать drag-and-drop в этой задаче.
- Сохранить RU/EN i18n и глобальную тему.
- Не ломать открытие, preview, edit lock и сохранение markdown-файлов.

## Не входит в задачу

- Drag-and-drop перемещение файлов и папок.
- Rename.
- Bulk operations.
- Контекстное меню.

## Желаемое поведение

- Корень хранилища показывается как дерево.
- Папки раскрываются и сворачиваются inline.
- Содержимое папки загружается лениво при первом раскрытии.
- Выбранный файл подсвечивается.
- Кнопки создания и удаления остаются у строк.
- Создание файла/папки внутри папки раскрывает/обновляет эту папку.
- Состояние раскрытых папок сохраняется локально для хранилища.

## Затронутые области

- `web/src/features/files/VaultFilesPanel.jsx`
- `web/src/features/i18n/LanguageProvider.jsx`
- `web/src/styles.css`
- `web/src/App.test.jsx`

## Заметки по реализации

- Хранить entries по path папки: root `.` и дочерние пути.
- Для root использовать загрузку при входе на страницу.
- Для папок использовать lazy-load при раскрытии.
- Для сохранения раскрытых папок использовать `localStorage` ключ на `slug`.

## Критерии приёмки

- Папки раскрываются без замены всего списка.
- Дочерние файлы видны с отступом.
- Создание/удаление обновляет нужную папку.
- Тесты и smoke проходят.

## План тестирования

- `npm test`
- `npm run build`
- `go test ./...`
- `cd test && docker compose up -d --build`
- `./test/run-smoke.sh`
- Playwright MCP проверка дерева на `http://127.0.0.1:18081`.

## Результаты валидации

- `npm test` из `web/`: 3 test files passed, 22 tests passed.
- `npm run build` из `web/`: production frontend build passed.
- `go test ./...`: passed.
- `cd test && docker compose up -d --build`: test stack rebuilt and started on canonical port 18081.
- `./test/run-smoke.sh`: passed.
- Playwright MCP на `http://127.0.0.1:18081/?page=vault&slug=admin`: проверены inline-раскрытие папки, отсутствие ложных disclosure-кнопок у файлов, создание файла в раскрытой папке и удаление этого файла.

## Откат

Откатить frontend changes и task/plan. Backend/data не трогать.
