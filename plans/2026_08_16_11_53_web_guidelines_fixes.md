# Web guidelines fixes

Task: [16_08_2026_11_53_web_guidelines_fixes.md](../tasks/16_08_2026_11_53_web_guidelines_fixes.md)

## Последовательность реализации

1. Добавить i18n-ключи для setup/loading/archive confirmation и поправить ellipsis.
2. Заменить topbar/breadcrumb navigation buttons на links с SPA click handler.
3. Добавить skip link и main id.
4. Синхронизировать vault section/view mode с URL params.
5. Добавить confirmation перед archive.
6. Поправить form attrs: `name`, `autoComplete`, `spellCheck`, URL input attrs.
7. Заменить ручное byte formatting на `Intl.NumberFormat`.
8. Обновить tests и прогнать проверки.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- Query param sync может конфликтовать с browser back.
- `<a>` navigation должна перехватывать только обычный click, иначе сломает new tab behavior.

## Заметки по откату

Откатить только frontend guideline cleanup и связанные тесты.
