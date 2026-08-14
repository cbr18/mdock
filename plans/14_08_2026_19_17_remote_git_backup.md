# Remote git backup

Task: [14_08_2026_19_17_remote_git_backup.md](../tasks/14_08_2026_19_17_remote_git_backup.md)

## Последовательность реализации

1. Спроектировать credentials storage.
2. Добавить remote config model.
3. Добавить git push queue/manual trigger.
4. Добавить tests with bare repo.
5. Добавить docs.

## Проверки

- `go test ./...`
- `npm test`
- `docker compose --env-file test/.env.test.example -f test/docker-compose.yml up -d --build`
- `./test/run-smoke.sh`
- Unit/integration test с локальным bare remote.

## Риски

- Credentials нельзя логировать или хранить в открытом виде без решения.

## Заметки по откату

Откатить API/schema. Не трогать локальные git repos.
