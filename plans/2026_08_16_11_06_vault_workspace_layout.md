# Vault workspace layout

Task: [16_08_2026_11_06_vault_workspace_layout.md](../tasks/16_08_2026_11_06_vault_workspace_layout.md)

## Последовательность реализации

1. Добавить i18n-ключи для вкладок vault, режимов preview/plain/split и plain labels.
2. Переразложить `VaultPage`: верх страницы, breadcrumbs, vault tabs, editor workspace, settings/status.
3. Переделать `VaultFilesPanel` в wide workspace: files sidebar слева, document area справа.
4. Добавить readonly plain viewer и split mode рядом с rendered preview.
5. Обновить CSS: wider max-width для vault workspace, document surface, mobile stacking, согласованные theme/language controls.
6. Обновить frontend tests под новую структуру и modes.
7. Прогнать checks.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- Split view может стать тесным на mobile; на малых экранах нужно стекать панели вертикально.
- Plain mode пока readonly, пользователь может ожидать редактирование; в UI не называть это полноценным editor.
- Увеличение рабочей ширины не должно сломать dashboard/admin pages.

## Заметки по откату

Откатить изменения `VaultPage`, `features/files`, CSS и тестов одним focused revert.
