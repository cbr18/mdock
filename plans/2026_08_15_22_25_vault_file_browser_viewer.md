# Vault file browser и markdown viewer

Task: [15_08_2026_22_25_vault_file_browser_viewer.md](../tasks/15_08_2026_22_25_vault_file_browser_viewer.md)

## Последовательность реализации

1. Добавить frontend API wrapper для File API.
2. Добавить file browser components: breadcrumbs, directory entries, selected file state.
3. Добавить markdown viewer component на `react-markdown`.
4. Встроить file browser/viewer в active `VaultPage`.
5. Стилизовать markdown под Obsidian-like preview через theme tokens.
6. Добавить/обновить frontend tests.
7. Прогнать checks и Playwright.

## Проверки

- `npm test`
- `npm run build`
- `go test ./...`
- `./test/run-smoke.sh`
- Playwright UI smoke.

## Риски

- Реально 1:1 с Obsidian недостижимо без полного Obsidian renderer/plugin model; MVP покрывает базовый markdown rendering.
- Large files могут быть тяжёлыми для preview; в этой задаче не добавляем virtualized viewer.

## Заметки по откату

Откатить frontend files/viewer components и стили.
