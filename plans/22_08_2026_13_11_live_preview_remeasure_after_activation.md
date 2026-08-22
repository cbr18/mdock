# Live preview remeasure after activation

Task: [22_08_2026_13_11_live_preview_remeasure_after_activation.md](../tasks/22_08_2026_13_11_live_preview_remeasure_after_activation.md)

## Последовательность реализации

1. Добавить helper для deferred `view.requestMeasure()` после activation dispatch.
2. Вызвать helper после `setActiveBlock` в `RenderedMarkdownBlockWidget`.
3. Вызвать helper после `setActiveBlock` в `RenderedMarkdownDocumentWidget`.
4. Добавить active line DOM-caret handler для точного click-to-cursor внутри уже раскрытого source block.
5. Прогнать frontend tests/build.
6. Прогнать Go tests, test stack, smoke.
7. Проверить headless Chromium сценарий active list block.

## Проверки

- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium: click по второй active list line дал `cursorLine: 1`.

## Риски

- `requestMeasure` должен вызываться после DOM update, иначе measurement снова может попасть в старое состояние.
- Нельзя запускать бесконечный цикл measurements.

## Заметки по откату

Откатить helper и вызовы remeasure. Backend и данные не требуют отката.
