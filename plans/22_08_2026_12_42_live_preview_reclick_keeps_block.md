# Live preview reclick keeps active block

Task: [22_08_2026_12_42_live_preview_reclick_keeps_block.md](../tasks/22_08_2026_12_42_live_preview_reclick_keeps_block.md)

## Последовательность реализации

1. Изолировать lifecycle active block в `livePreviewExtension`.
2. Добавить focused test для list block: после активации повторная selection внутри блока не сбрасывает active state.
3. Убрать auto-reset active state от selection: повторные клики внутри source block не должны закрывать блок.
4. Добавить хранение `sourceTo`, чтобы active range не зависел от absorbed separator range.
5. Проверить, что rendered widgets для остальных блоков продолжают переключать active block explicit-кликом.
6. Прогнать frontend tests, build, Go tests, test stack, smoke и headless Chromium сценарий.

## Проверки

- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium сценарий на `live-preview-check.md` — успешно: после второго клика active list block остался source block.

## Риски

- Если слишком ослабить сброс active block, несколько блоков могут визуально вести себя неочевидно при клике вне активного блока.
- Тесты CodeMirror в jsdom могут не покрыть реальные pointer events, поэтому лучше тестировать state transitions напрямую.

## Заметки по откату

Откатить изменения в live preview extension и focused tests. Backend и данные не требуют отката.
