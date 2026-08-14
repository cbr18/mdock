Status: DONE

# Server Production Readiness

Plan: [14_08_2026_21_00_server_production_readiness.md](../plans/14_08_2026_21_00_server_production_readiness.md)

## Проблема

Серверный MVP уже работает, но перед переходом к веб-интерфейсу нужно закрыть базовые серверные пробелы: управляемые миграции БД, безопасная регистрация первого администратора, SQL-бэкапы для деплоя, startup maintenance для vault'ов, CI/CD заготовки под Forgejo и GitHub Actions, а также единое описание API.

## Доказательства

- SQLite-схема сейчас инициализируется напрямую в `internal/store/store.go` через набор `CREATE TABLE IF NOT EXISTS` и `ALTER TABLE`.
- Bootstrap admin сейчас завязан на обязательные `BOOTSTRAP_USERNAME` и `BOOTSTRAP_PASSWORD`.
- Deploy pipeline и SQL backup flow не описаны и не автоматизированы.
- API разнесён по handlers и README, единого contract-документа нет.

## Нефункциональные ограничения

- Не добавлять тяжёлые зависимости для миграций и бэкапов.
- Не хранить секреты, remote credentials или production URLs в репозитории.
- CI/CD должен быть переносимым между Forgejo Actions и GitHub Actions.
- Бэкап БД должен быть SQL DDL+DML dump, независимый от git.
- Remote git auto-push должен работать только когда remote подключён.

## Не входит в задачу

- App-passwords для WebDAV устройств.
- Shared vaults и управление участниками.
- Полноценный UI для всех API.
- Полная проработка git-стратегии beyond текущих maintenance-правок.

## Желаемое поведение

- БД применяет версионированные миграции и записывает применённые версии.
- Первый пользователь может быть создан через setup-регистрацию и становится admin.
- После появления первого пользователя публичная регистрация закрыта; новых пользователей создаёт admin.
- Admin не может отключить последнего активного администратора.
- Перед деплоем можно получить SQL backup с DDL и DML в отдельной backup-папке.
- При старте сервер готовит все vault'ы: каталог, git repo, main branch, recovery commit, очистка истёкших runtime-состояний.
- Pipeline test выполняет сборку и тесты.
- Pipeline prod deploy создаёт DB backup и обновляет compose stack на сервере.
- API описан в `docs/server-api.md`.

## Затронутые области

- `cmd/mdock`
- `internal/config`
- `internal/store`
- `internal/app`
- `internal/httpapi`
- `internal/locks`
- `docs`
- `.github/workflows`
- `.forgejo/workflows`
- `scripts`
- `test`

## Заметки по реализации

- Миграции сделать встроенным Go-кодом без новой зависимости.
- SQL dump делать отдельной командой `mdock backup-sql`, чтобы deploy мог запускать её перед миграциями приложения.
- Для первого admin использовать `FIRST_ADMIN_TOKEN` как опциональную защиту setup-регистрации.
- Legacy bootstrap через env оставить для dev/test и обратной совместимости, но сделать необязательным.

## Критерии приёмки

- `go test ./...` проходит.
- `npm test` проходит.
- `docker compose config` проходит.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` проходит.
- `./test/run-smoke.sh` проходит на test stack.
- SQL backup создаёт файл с DDL и DML.
- Документы описывают deploy, API и ограничения git auto-push.

## План тестирования

- Unit-тесты store/app/server.
- Smoke-тест через `./test/run-smoke.sh`.
- Проверка compose config.
- Проверка CLI `mdock backup-sql` через `go run`.

## Результаты валидации

- `go test ./...` — пройдено.
- `npm test` — пройдено.
- `npm run build` — пройдено.
- `docker compose config` — пройдено.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml config` — пройдено.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build` — test stack пересобран и поднят.
- `./test/run-smoke.sh` — пройдено.
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml run --rm --no-deps mdock backup-sql --out /backups` — SQL backup создан.

## Откат

- Откатить commit задачи.
- Если миграции уже применились локально, восстановить SQLite из SQL backup или тестового volume snapshot.

## Commits

- `666729a` — Prepare server for production deployment.
