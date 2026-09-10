# Live preview cursor alignment

Task: [22_08_2026_13_04_live_preview_cursor_alignment.md](../tasks/22_08_2026_13_04_live_preview_cursor_alignment.md)

## Последовательность реализации

1. Проверить active source line CSS и убрать искусственную фиксированную высоту, которая может конфликтовать с CodeMirror measurement.
2. Оставить визуальное выделение active block через background/border, но не ломать line box.
3. При необходимости скорректировать list/table/code active line padding так, чтобы line boxes были стабильными.
4. Прогнать frontend tests и build.
5. Прогнать Go tests, test stack и smoke.
6. Проверить browser scenario на активном list block.

## Проверки

- `npm test` — успешно, 25 tests passed.
- `npm run build` — успешно.
- `go test ./...` — успешно.
- `cd test && docker compose up -d --build` — успешно.
- `./test/run-smoke.sh` — успешно.
- Headless Chromium проверка active list line geometry — успешно.

## Риски

- Если убрать фиксированную высоту слишком резко, active block может выглядеть менее ровным.
- CodeMirror измеряет DOM динамически, поэтому CSS должен быть простым и близким к обычным строкам.

## Заметки по откату

Откатить изменения CSS/extension и тесты этой задачи. Backend и данные не требуют отката.
