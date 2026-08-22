# Forgejo CI/CD deploy pipeline

Task: [22_08_2026_13_53_forgejo_ci_cd_deploy.md](../tasks/22_08_2026_13_53_forgejo_ci_cd_deploy.md)

## Последовательность реализации

1. Обновить `.forgejo/workflows/test.yml`: оставить запуск на push во все ветки кроме `main`, добавить ручной запуск, зафиксировать полный тестовый набор.
2. Обновить `.forgejo/workflows/prod-deploy.yml`: добавить CI job перед deploy и оставить deploy только для `main`/ручного запуска.
3. Удалить `.github/workflows/test.yml` и `.github/workflows/prod-deploy.yml`, потому что проект использует Forgejo Actions вместо GitHub Actions.
4. Обновить `docs/deployment.md`: описать веточную схему, тесты, smoke через test stack, deploy secrets и SQL backup перед обновлением.
5. Запустить релевантные проверки и записать результаты в task-файл.

## Проверки

- `go test ./...`
- `npm test` в `web/`
- `npm run build` в `web/`
- `docker compose config`
- `docker compose config` из папки `test/`
- `git diff --check`

## Риски

- Forgejo runner должен иметь Docker/Compose, Go 1.26 и Node 22 setup action support.
- SSH deploy зависит от корректно заведённых secrets и существующего checkout на production server.
- Smoke test в CI будет занимать больше времени, потому что поднимает Docker stack.

## Заметки по откату

- Откатить изменения workflow и документации одним revert.
- Если Forgejo runner не поддержит Docker smoke, временно убрать только smoke шаги, не меняя branch policy.
