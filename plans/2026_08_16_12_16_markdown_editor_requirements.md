# Markdown editor requirements

Task: [16_08_2026_12_16_markdown_editor_requirements.md](../tasks/16_08_2026_12_16_markdown_editor_requirements.md)

## Последовательность реализации

1. Собрать первичные источники CommonMark/GFM/Obsidian.
2. Описать compatibility target и storage model.
3. Составить таблицу действий редактора.
4. Описать toolbar groups, lock/save и security requirements.
5. Обновить task-файл результатами.

## Проверки

- Ручная проверка структуры документа.
- Проверка, что требования не противоречат текущему API файлов/локов.

## Риски

- "100% совместимость" может означать render parity, edit/source parity или sync parity. В документе явно фиксируем, что MVP гарантирует source compatibility, а render parity расширяется поэтапно.

## Заметки по откату

Откатить документацию и task/plan, код не трогается.
