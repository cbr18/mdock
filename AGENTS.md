# AGENTS.md

## Scope

This file defines repository-local instructions for AI coding agents.

The project is new. Do not assume any previous architecture, service names, deployment setup, database layout, task workflow, or testing stack unless it is present in this repository or explicitly provided by the user.

## Workflow

- Do not edit code or files unless the user explicitly asks to implement, fix, change, or create something.
- For investigations, read the relevant code, docs, configuration, and logs first, then report findings before changing anything.
- If requirements are ambiguous or risky, ask before implementing.
- Do not touch unrelated untracked or modified files.
- Do not push, deploy, reset, or revert unless explicitly asked.
- Never push directly to `main` unless explicitly instructed.
- Keep changes focused on the requested area.
- One task should produce one focused change. Do not include opportunistic refactors.
- Answer concisely and do only what was explicitly requested. Do not expand scope without approval.
- When changing an existing flow, preserve its documented behavior and non-functional properties unless the task explicitly changes them.
- When changing code, keep related documentation and contract notes up to date in the same task when such documentation exists.
- Prefer existing project patterns, dependencies, tools, and style over introducing new ones.

## Tasks And Plans

- Проектные задачи хранятся в `tasks/`.
- Проектные планы хранятся в `plans/`.
- Формат задач и планов должен быть примерно как в соседнем проекте `../CarsParser`, но текст для этого репозитория пишется на русском.
- Для крупных, сквозных, рискованных или меняющих поведение правок создавай task-файл до реализации и поддерживай его актуальным до завершения.
- Когда большая правка требует ревью пользователя перед реализацией, сначала создай задачу и план, затем покажи план реализации до редактирования кода.
- Держи task- и plan-файлы в рамках этого репозитория.
- Если в этом репозитории есть шаблон задачи или плана, используй его вместо нового формата.
- Имена task-файлов: `DD_MM_YYYY_HH_MM_description.md`.
- Имена plan-файлов: `DD_MM_YYYY_HH_MM_description.md`.
- Каждый task-файл должен содержать верхнеуровневую строку статуса: `Status: CREATED`, `Status: IN WORK`, `Status: DONE` или `Status: REJECTED`.
- Каждый task-файл должен содержать ссылку `Plan: [plan-file.md](../plans/plan-file.md)`.
- Каждый plan-файл должен содержать обратную ссылку `Task: [task-file.md](../tasks/task-file.md)`.
- Статус задачи держи внутри файла, а не в имени файла, чтобы ссылки оставались стабильными.
- Когда по задаче сделаны коммиты, записывай связанные commit hashes в task-файл.
- Task-файл должен включать секции на русском: `Проблема`, `Доказательства`, `Нефункциональные ограничения`, `Не входит в задачу`, `Желаемое поведение`, `Затронутые области`, `Заметки по реализации`, `Критерии приёмки`, `План тестирования`, `Результаты валидации`, `Откат`.
- Plan-файл должен включать секции на русском: `Последовательность реализации`, `Проверки`, `Риски`, `Заметки по откату`.

## Documentation

- Keep documentation close to the area it describes unless the repository already has a documented convention.
- Root-level project documentation should live in `docs/` when such a directory exists or is requested.
- Service-owned or package-owned documentation should live beside the relevant service or package when appropriate.
- Do not edit generated documentation by hand.
- Keep machine-readable API or contract snapshots updated only when the API contract is intentionally changed or refreshed.

## Forbidden Without Explicit Request

- Do not change database migrations or generated migration snapshots.
- Do not update lock files unless dependency changes were requested or the package manager requires it for the requested change.
- Do not change deployment scripts, infrastructure configuration, CI configuration, environment files, or production configuration unless the task requires it.
- Do not add new packages, linters, formatters, frameworks, background services, or build tools without approval.
- Do not hardcode secrets, tokens, passwords, API keys, production URLs, or credentials.
- Do not log secrets or full authorization headers.
- Do not run destructive commands such as hard resets, forced checkouts, broad deletes, or volume cleanup unless explicitly requested.

## Code Organization

- Follow the existing repository structure and naming conventions.
- Keep domain types, business logic, API boundaries, persistence code, external clients, and UI code separated according to the patterns already present.
- Put tests next to the code or in the test location already used by the project.
- Prefer small pure helpers for reusable logic when that matches local style.
- Add abstractions only when they remove real complexity or match an established local pattern.

## Frontend Theme

- The web UI uses one global theme system based on CSS custom properties.
- Do not hardcode colors directly inside feature/page components when a theme token exists.
- Components must use global tokens for background, surface, text, muted text, borders, focus rings, accents, danger/success/warning states, and shadows.
- Theme settings are global for the whole frontend, not per component.
- The default visual direction is a soft Obsidian/Zed-like workspace: calm surfaces, modern icons, moderate rounded corners, compact controls, and no marketing/landing-page layout.
- Supported background themes: `black`, `dark`, `warm`, `light`.
- Supported accent colors should remain a small curated set, initially: violet, blue, cyan, green, amber, rose.
- Text colors must be derived from the selected background theme so contrast remains readable on black, dark-gray, beige/warm, and white backgrounds.
- Persist theme and accent choice in `localStorage` for MVP. Do not add backend user preferences until explicitly requested.

## Error Handling

- Return or surface errors with useful context.
- Avoid panics, crashes, and uncaught exceptions in request, worker, service, or UI paths.
- Convert validation, authorization, and business failures into explicit user-facing or API-facing errors at boundaries.
- Log server-side failures with enough structured context to debug the issue, without logging secrets.
- Preserve cancellation and timeout semantics in asynchronous or long-running code.
- In frontend code, surface recoverable API errors through existing UI state patterns instead of throwing from render paths.

## Formatting And Linting

- Use the formatting and linting tools already configured in the repository.
- Do not introduce new formatting or linting tools just to complete a change.
- If formatting tools would rewrite unrelated files, limit formatting to changed files when possible.
- Before committing or reporting completion, run the most relevant tests or checks for the touched area.
- If a required test or check cannot be run, report that clearly and explain why.

## Testing

- Cover new features and behavior changes with relevant tests.
- Test every logic change with the relevant project test command before reporting completion.
- For bug fixes, prefer tests that fail before the fix and pass after it when practical.
- For integration-sensitive changes, validate the affected integration path using the repository's existing scripts or documented workflow.
- Do not assume local test data, local containers, or generated artifacts represent production state.
