# Markdown editor requirements

Status: DONE
Created: 2026-08-16 12:16
Project: mdock
Plan: [16_08_2026_12_16_markdown_editor_requirements.md](../plans/16_08_2026_12_16_markdown_editor_requirements.md)

## Проблема

Перед реализацией богатого веб-редактора нужно явно зафиксировать Markdown/Obsidian compatibility target и список действий редактора, иначе UI легко начнёт генерировать Markdown, который плохо открывается в Obsidian.

## Доказательства

- Obsidian использует CommonMark, GFM, LaTeX и собственные расширения.
- Текущий preview поддерживает только GFM/frontmatter/highlight и не описывает полный editor contract.
- Пользователь запросил большой анализ, таблицу действий и 100% совместимость с Obsidian.

## Нефункциональные ограничения

- Не внедрять WYSIWYG-модель, которая сериализует документ в нестандартный формат.
- Все требования писать на русском.
- Использовать первичные источники: CommonMark, GFM, Obsidian Help.
- Не менять backend/frontend код в этой задаче, кроме документации и task/plan.

## Не входит в задачу

- Реализация editor transforms.
- Реализация toolbar UI.
- Mermaid/MathJax/render plugins.
- Индекс backlinks/wikilinks.

## Желаемое поведение

- В `docs/` есть документ требований с таблицей редакторских действий.
- Требования разделяют MVP, later и preserve-only поведение.
- Документ описывает lock/save/security требования для будущей реализации.

## Затронутые области

- `docs/markdown-editor-requirements.md`
- `tasks/`
- `plans/`

## Заметки по реализации

- Основной формат хранения — plain UTF-8 Markdown source.
- Toolbar commands должны быть текстовыми трансформациями, а не HTML/WYSIWYG state.

## Критерии приёмки

- Документ содержит ссылки на источники.
- Есть таблица действий с source, MVP/later и примечаниями.
- Есть требования к lock/save/security.

## План тестирования

- Документарная задача: проверить ссылки/структуру вручную.

## Результаты валидации

- `docs/markdown-editor-requirements.md` создан.
- Источники CommonMark/GFM/Obsidian зафиксированы ссылками.
- Таблица действий, lock/save и security requirements описаны.

## Откат

Удалить созданный документ и task/plan.
