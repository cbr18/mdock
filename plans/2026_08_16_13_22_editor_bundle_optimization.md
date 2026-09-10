# Editor bundle optimization

Task: [16_08_2026_13_22_editor_bundle_optimization.md](../tasks/16_08_2026_13_22_editor_bundle_optimization.md)

## Последовательность реализации

1. Убрать import `@codemirror/language-data` из editor.
2. Оставить Markdown extension без embedded language list.
3. Удалить прямую dependency из package/lock.
4. Прогнать tests/build/go tests.
5. Обновить task validation.

## Проверки

- `rg "language-data" web/src web/package.json`
- `npm test`
- `npm run build`
- `go test ./...`

## Риски

- В CodeMirror source editor исчезнет подсветка синтаксиса внутри fenced code blocks. Это приемлемо: сами блоки Markdown сохраняются, а rendered preview подсвечивает код через `rehype-highlight`.

## Заметки по откату

Вернуть dependency и прежнюю конфигурацию markdown extension.
