Task: [2026_10_14_22_00_playwright_e2e_testing.md](../tasks/2026_10_14_22_00_playwright_e2e_testing.md)

# Последовательность реализации

## Этап 1: Исправление хелперов и базовых селекторов
1. [x] Аудит реальных текстов кнопок/лейблов в UI
2. [x] Исправление `orRole`, `orText`, `orLocator` хелперов
3. [x] Исправление auth.spec.ts и dashboard.spec.ts
4. [x] Запуск и прохождение auth + dashboard тестов

## Этап 2: Исправление vault-editor.spec.ts
1. Аудит страницы Vault Page (Editor, Activity, Settings tabs)
2. Исправление селекторов для:
   - File tree panel (region "Файлы")
   - Create file/folder buttons (используют aria-label, не title)
   - Open file (ссылки в дереве)
   - View mode tabs (Просмотр/Исходник/Две панели)
   - Edit mode checkbox (label "Редактирование")
   - Save button
   - Toolbar меню (Paragraph, Inline Formatting, List Formatting, Insert)
   - Activity tab (tab "activity")
   - Settings tab panels (Vault info, Members, Git status, Snapshots, Remote, Commits)
3. Исправление helper функций: `createFile`, `createFolder`, `openFile`, `enableEditing`, `switchViewMode`, `deleteFile`, `goToSection`, `renameVault`, `archiveVault`, `setGitRemote`, `pushGitRemote`

## Этап 3: Исправление settings-admin.spec.ts
1. Theme settings (кнопка "Настройки темы" -> меню с темами и акцентами)
2. Language switcher
3. Navigation (topbar links)
4. Account page (change password form)
5. Admin users page (user list, create/disable/enable/password reset/sessions)
6. Error handling tests

## Этап 4: Запуск полного набора тестов и баг-헌тинг
1. Параллельный запуск всех тестов
2. Анализ падений — разделение на проблемы селекторов vs реальные баги приложения
3. Создание задач на исправление реальных багов
4. Исправление багов в коде приложения
5. Повторный прогон до 100% прохождения

## Этап 5: Финализация
1. Merge в dev ветку
2. Push на origin

# Проверки

- Каждый этап проверяется запуском соответствующих тест-файлов
- Полный прогон: `npx playwright test --project=chromium`
- Smoke тесты после исправлений багов: `cd test && ./run-smoke.sh`

# Риски

- Тестовый стек может нестабильно работать при параллельных тестах (race conditions в БД)
- Некоторые операции (git push, импорт) требуют больших таймаутов
- UI текст может отличаться в RU/EN локалях
- Некоторые элементы рендерятся лениво (Suspense/lazy)

# Заметки по откату

- `cd test && docker compose down -v` — полная очистка тестового окружения
- `docker compose up -d --build` — пересоздание
- Git commit перед каждым этапом исправлений