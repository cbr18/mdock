# Roadmap and update script

Status: DONE
Created: 2026-08-23 15:43
Project: mdock
Plan: [23_08_2026_15_43_roadmap_and_update_script.md](../plans/23_08_2026_15_43_roadmap_and_update_script.md)

## Проблема

После появления release strategy проекту нужен понятный roadmap и базовый безопасный update script, чтобы следующие работы шли по приоритетам, а production-сервер можно было обновлять воспроизводимо.

## Доказательства

- Есть `docs/release-strategy.md`, но нет `docs/roadmap.md`.
- Есть production deploy script, но нет пользовательского update script.
- Пользователь уточнил исходную нумерацию roadmap: пункты 1–4 относятся к release/update блоку и уже сделаны; текущие следующие задачи — 14 Git history UI и 15 Markdown toolbar implementation.

## Нефункциональные ограничения

- `update.sh` без флагов должен спрашивать подтверждение перед обновлением.
- Перед применением обновления должен выполняться существующий backup/deploy flow.
- Не добавлять внешние зависимости вроде `jq`.
- Не хранить GitHub token или secrets.
- Не трогать production pipeline в этой задаче.

## Не входит в задачу

- Публикация GitHub Releases.
- Автоматическое скачивание бинарных artifacts.
- Docker registry flow.
- Реализация mobile/adaptive UI.
- Реализация Git history UI.
- Реализация Markdown toolbar.

## Желаемое поведение

- Добавлен `docs/roadmap.md` с очередью версий и приоритетами.
- В roadmap явно отмечено:
  - `1` Roadmap проекта — done;
  - `2` Release checklist и tag-flow — done;
  - `3` `update.sh` — done;
  - `4` GitHub release compatibility — done;
  - следующие задачи: `14` Git history UI и `15` Markdown toolbar implementation.
- Добавлен `scripts/update.sh`.
- `scripts/update.sh --check` показывает локальную и последнюю доступную версию.
- `scripts/update.sh` без флагов интерактивно обновляет checkout из `main` и запускает deploy flow после подтверждения.
- `scripts/update.sh --apply` обновляет checkout до выбранного tag/branch и запускает `scripts/deploy-prod.sh`.
- `scripts/update.sh --target vX.Y.Z` позволяет обновиться на конкретный tag.
- `scripts/update.sh --branch main` позволяет обновиться по branch flow.

## Затронутые области

- `docs/roadmap.md`
- `docs/release-strategy.md`
- `README.md`
- `scripts/update.sh`
- `tasks/`
- `plans/`

## Заметки по реализации

- Latest tag берём через `git ls-remote --tags` от `https://github.com/cbr18/mdock.git`.
- Сравнение версий делаем через `sort -V`.
- Текущую версию берём из `VERSION`.
- Перед checkout проверяем, что рабочее дерево чистое.
- `--apply` требует явного подтверждения, если не передан `--yes`.

## Критерии приёмки

- Roadmap документирует ближайшие и последующие блоки.
- Update script имеет help/check/apply режимы.
- Check mode работает без изменения файлов.
- Shell syntax check проходит.
- Документация ссылается на roadmap/update script.

## План тестирования

- `bash -n scripts/update.sh`
- `scripts/update.sh --help`
- `scripts/update.sh --check`

## Результаты валидации

- `bash -n scripts/update.sh` — passed.
- `scripts/update.sh --help` — passed.
- `scripts/update.sh --check` — passed, installed version `0.1.0-alpha.1`, latest GitHub tag not found.
- `scripts/update.sh` без флагов — показывает prompt `Apply update to branch main...`; ответ `n` отменяет update без изменений.

## Commits

- Не создано: изменения подготовлены локально.

## Откат

- Удалить `docs/roadmap.md`.
- Удалить `scripts/update.sh`.
- Убрать ссылки из README/release strategy.
