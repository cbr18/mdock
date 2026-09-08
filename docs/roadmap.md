# Roadmap

Roadmap фиксирует направление работ, но не заменяет task-файлы. Перед реализацией крупных блоков всё равно создаётся отдельная задача и план.

## Текущий Статус

Текущая линия: `0.1.0-alpha`.

Уже есть:

- backend на Go;
- SQLite runtime-state;
- встроенная auth/session модель;
- personal vaults и memberships;
- WebDAV для Obsidian/Remotely Save;
- локальная git-история на каждый vault;
- web UI: dashboard, vault settings, file tree, markdown preview/editor;
- deploy через Docker Compose и Forgejo Actions;
- SQL backup перед production deploy;
- release metadata: `VERSION`, `CHANGELOG.md`, `mdock version`, `GET /api/version`.

`1.0.0` пока рано: ещё не стабилизированы mobile UX, editor UX, backup/restore и upgrade flow.

## Статус Очереди

- `1` Roadmap проекта — done.
- `2` Release checklist и tag-flow — done.
- `3` `update.sh` — done.
- `4` GitHub release compatibility — done.
- Следующая задача: `5` Mobile-first responsive audit.

## Полная Очередь Задач

### Release / Update / Roadmap

1. **Roadmap проекта** — done
   - Создать `docs/roadmap.md`.
   - Разложить функционал по версиям: `0.1.x`, `0.2.0`, `0.3.0`, `0.4.0`, `1.0.0`.
   - Отдельно отметить: MVP, later, not planned.
   - Связать roadmap с `docs/release-strategy.md`.
   - Зафиксировать, что `1.0.0` пока рано.

2. **Release checklist и tag-flow** — done
   - Дополнить `docs/release-strategy.md`.
   - Описать порядок: bump version -> changelog -> tests -> smoke -> tag -> deploy.
   - Зафиксировать, что `v0.1.0-alpha.1` будет первым публичным release candidate.
   - Breaking env/API changes до `1.0.0` идут только через minor.

3. **`update.sh`** — done
   - Добавить `scripts/update.sh`.
   - Читать установленную версию через `mdock version` или локальный `VERSION`.
   - Брать последнюю версию из GitHub releases/tags.
   - Сравнивать SemVer.
   - При update делать SQL backup, `git fetch`, checkout tag/main, rebuild/restart через Docker Compose.
   - Параметры: `--check`, `--apply`, `--target vX.Y.Z`, `--branch main`, `--yes`.

4. **GitHub release compatibility** — done
   - Для MVP latest version берётся через `git ls-remote --tags https://github.com/cbr18/mdock.git`.
   - GitHub Releases API можно добавить позже, если releases будут публичными или появится token flow.

### Current Next

14. **Git history UI** — done
   - Страница/секция истории vault.
   - Список коммитов.
   - Changed files в коммите.
   - Markdown diff/read-only preview.
   - Позже: restore file from commit.

15. **Markdown toolbar implementation** — done
   - Реализованы команды, которые были только описаны требованиями.
   - Headings, lists, task lists, quote, code block, table insert, link/image/wikilink/embed, callout, math, footnote, comment, frontmatter helper.
   - Всё сохраняет обычный Markdown, совместимый с Obsidian.
   - Проверено Playwright-сценарием (inline/paragraph/lists/insert-form + save).

### Web UI / Mobile / Adaptive

5. **Mobile-first responsive audit**
   - Использовать `web-design-guidelines`.
   - Проверить login/setup, dashboard, vault editor, file tree, settings, admin users, account.
   - Viewports: `360x740`, `390x844`, `430x932`, `768x1024`, desktop.
   - Результат: список конкретных UI-проблем, screenshots, task plan.

6. **Mobile layout redesign**
   - File tree на телефоне как drawer/bottom sheet, а не постоянная левая колонка.
   - Editor/preview занимают почти весь экран.
   - Header/actions сжаты: icons, menus, overflow.
   - Pathbar компактный и не ломается на длинных путях.
   - Tabs `Просмотр` / `Исходник` / `Две панели` на телефоне в compact mode.
   - `Две панели` на телефоне превращается в переключаемый режим, а не две узкие колонки.

7. **Touch UX**
   - Нормальные touch targets.
   - Fallback для move через menu, не только drag/drop.
   - Контекстные действия файла/папки через menu/kebab.
   - Удаление/перемещение через confirm/dialog.

8. **Responsive editor**
   - CodeMirror и live preview на телефоне.
   - Проверить клавиатуру, высоту viewport, scroll locking.
   - Toolbar редактора на mobile: horizontal scroll или группировка в menu.
   - Клавиатура не должна перекрывать save/edit controls.

### WebDAV / Obsidian Stability

9. **Remotely Save compatibility hardening**
   - Дотестировать `remoteBaseDir` empty/custom, `Depth: 1`, custom headers, sync `.obsidian`, Unicode/space paths, overwrite, delete, move.
   - Добавить smoke cases, где не хватает.

10. **Depth infinity decision**
   - Сейчас `Depth: infinity` отклоняется.
   - Решить: оставить documented unsupported или реализовать controlled recursive PROPFIND.
   - Для `0.2.0` можно не трогать infinity, если Remotely Save default стабилен.

11. **WebDAV app-passwords**
   - Не MVP, но важная server feature.
   - Отдельные токены для Obsidian/WebDAV устройств.
   - Можно отозвать телефон без смены основного пароля.

### Git / Backup / Recovery

12. **Vault restore workflow**
   - Restore SQLite.
   - Restore vault files from git.
   - Restore whole server from backups.
   - Без этого до `1.0.0` идти нельзя.

13. **Remote git backup UX**
   - Web UI форма для remote.
   - Manual push button.
   - Показ last push/error.
   - Позже auto-push только если remote подключён.

### Editor

16. **Editor conflict recovery**
   - Если save получает conflict/lock lost: показать понятный UI, дать “Сохранить как копию”, не терять буфер.
   - Это важнее декоративных editor-фич.

17. **Attachments**
   - Upload files/images в vault.
   - Просмотр image/pdf как attachment.
   - Insert markdown image link.
   - Не пытаться редактировать бинарники как текст.

### Security / Ops

18. **Security review**
   - Auth/session cookies, CSRF, Basic Auth rate limit, path traversal, `.git` deny, body limits, logs без секретов.
   - Перед публичным release обязательно.

19. **Observability**
   - Version in logs on startup.
   - Structured startup config summary без секретов.
   - `/metrics` позже.

20. **Production docs**
   - nginx/Caddy examples.
   - HTTPS note.
   - System requirements.
   - Backup directory policy.
   - Update procedure через `scripts/update.sh`.

## `0.1.x` — Stabilize Current Alpha

Цель: текущий MVP должен быть удобно проверять одному пользователю или небольшой self-hosted группе.

Фокус:

- mobile/adaptive UI;
- устранение видимых UX-поломок;
- WebDAV/Remotely Save smoke coverage;
- update script;
- production docs cleanup;
- editor conflict recovery copy;
- basic restore documentation.

Не цель:

- shared vaults;
- CRDT/live collaboration;
- app-passwords;
- binary release artifacts.

## `0.2.0` — WebDAV/Obsidian Compatibility

Цель: mdock уверенно работает как self-hosted backend для Obsidian через Remotely Save.

Функции:

- расширенный Remotely Save compatibility suite;
- documented recommended plugin settings;
- custom `Remote Base Dir` scenarios;
- Unicode/space paths coverage;
- `.obsidian` sync coverage;
- stable CORS/WebDAV method behavior;
- понятная политика `Depth: infinity`: unsupported или controlled implementation;
- user-facing troubleshooting docs.

Критерий выхода:

- standard Remotely Save flow проходит smoke без ручных workaround.

## `0.3.0` — Web Editor Becomes Useful

Цель: web editor/viewer становится полноценным рабочим интерфейсом, а не только fallback.

Функции:

- mobile-friendly editor layout;
- implemented Markdown toolbar;
- conflict recovery UI: keep buffer, save as copy;
- attachment upload/preview;
- better live preview parity;
- file operations через меню на touch devices;
- keyboard and focus polish.

Критерий выхода:

- пользователь может комфортно читать и редактировать markdown с телефона и desktop без Obsidian.

## `0.4.0` — Operations And Recovery

Цель: сервер можно спокойно обновлять и восстанавливать.

Функции:

- restore workflow для SQLite backup;
- restore workflow для vault files из git;
- update script hardening;
- production reverse proxy examples;
- startup config summary без секретов;
- operational docs for backup retention;
- optional release tag workflow.

Критерий выхода:

- documented backup/restore/update procedure проходит вручную на test/prod-like stack.

## `0.5.0+` — Multi-user Growth

Цель: расширить модель пользователей без переписывания storage/git слоёв.

Возможные функции:

- shared vault creation;
- управление участниками vault;
- роли `read`/`write`/`owner` в UI;
- app-passwords для WebDAV устройств;
- remote git backup UX и optional auto-push;
- activity/audit views.

## `1.0.0` Criteria

`1.0.0` можно выпускать только когда:

- WebDAV стабилен с Obsidian Remotely Save documented settings;
- web UI закрывает базовый file/edit flow на mobile и desktop;
- backup/restore/update описаны и проверены;
- DB migrations имеют понятную upgrade policy;
- env/API contracts перестали часто ломаться;
- release checklist стабильно проходит;
- security review не оставляет критичных известных дыр.

## Not Planned For MVP

- CRDT/Yjs collaborative editing.
- Knowledge graph.
- Backlinks index.
- Mermaid.
- End-to-end encryption.
- External auth delegation как обязательная зависимость.
- PostgreSQL/MySQL/Redis.
