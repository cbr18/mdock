# Server API

Все JSON API живут под `/api`. WebDAV живёт отдельно под `/webdav/<vault-slug>/` и не описывается как JSON API.

## Auth

### `POST /api/auth/register`

Setup-регистрация первого пользователя.

Request:

```json
{
  "username": "admin",
  "password": "secret",
  "setup_token": "optional-token"
}
```

Поведение:

- если пользователей ещё нет, создаёт первого пользователя с `is_admin=true`, создаёт personal vault и открывает web session;
- если задан `FIRST_ADMIN_TOKEN`, поле `setup_token` должно совпасть;
- если хотя бы один пользователь уже есть, возвращает `403 registration_closed`.

### `POST /api/auth/login`

Открывает server-side session и ставит cookies:

- `mdock_session` — `HttpOnly`;
- `mdock_csrf` — readable cookie для передачи в `X-CSRF-Token` на mutating JSON API.

### `GET /api/auth/me`

Текущий пользователь.

### `POST /api/auth/logout`

Удаляет текущую session и чистит cookies.

### `POST /api/auth/password`

Смена собственного пароля.

Request:

```json
{
  "current_password": "old",
  "new_password": "new"
}
```

После смены все sessions пользователя отзываются.

## Admin Users

Все admin endpoints требуют web session admin-пользователя и CSRF header для mutating methods.

### `GET /api/admin/users`

Список пользователей без password hash.

### `POST /api/admin/users`

Создаёт обычного пользователя и его personal vault.

Request:

```json
{
  "username": "alice",
  "password": "secret"
}
```

Response содержит `user` и `vault`.

### `POST /api/admin/users/{login}/password`

Меняет пароль пользователя и отзывает его sessions.

### `POST /api/admin/users/{login}/disable`

Отключает пользователя и отзывает его sessions.

Ограничение: нельзя отключить последнего активного admin, ответ `409 last_active_admin`.

### `POST /api/admin/users/{login}/enable`

Включает пользователя.

### `POST /api/admin/users/{login}/sessions/revoke`

Отзывает все sessions пользователя.

## Vaults

Все vault endpoints требуют web session и CSRF header для mutating methods.

### `GET /api/vaults`

Список vault'ов, где пользователь является member.

Query:

- `archived=active` или пусто — только неархивные vaults;
- `archived=only` — только архивные vaults;
- `archived=include` — активные и архивные vaults.

### `POST /api/vaults`

Создаёт новый vault с текущим пользователем как owner.

Request:

```json
{
  "name": "Work Notes"
}
```

### `GET /api/vaults/{slug}`

Детали vault, включая WebDAV URL.

### `PATCH /api/vaults/{slug}`

Переименование display name vault. `slug` и физический `path` не меняются.

### `POST /api/vaults/{slug}/archive`

Архивирует vault. Архивный vault скрыт из списка и недоступен через WebDAV.

### `POST /api/vaults/{slug}/unarchive`

Возвращает vault из архива.

### `GET /api/vaults/{slug}/webdav`

Возвращает WebDAV path/url для vault.

### `GET /api/vaults/{slug}/members`

Список участников vault. В MVP только чтение, управление участниками не входит.

## Files

Все file endpoints требуют web session. Mutating methods требуют `X-CSRF-Token`.

Path rules:

- `path` всегда относительный путь внутри vault;
- абсолютные пути, `..` traversal и доступ к `.git` отклоняются;
- root path для list можно передать как пустой `path` или `.`;
- root path нельзя записывать, перемещать, удалять или lock'ать.

### `GET /api/vaults/{slug}/files?path=dir`

Возвращает entries директории.

Response:

```json
{
  "vault": {},
  "path": "dir",
  "entries": [
    {
      "name": "note.md",
      "path": "dir/note.md",
      "is_dir": false,
      "size": 12,
      "mod_time": "2026-08-15T00:00:00Z"
    }
  ]
}
```

### `GET /api/vaults/{slug}/files/content?path=note.md`

Читает UTF-8 text file.

Response:

```json
{
  "vault": {},
  "file": {},
  "content": "# Note"
}
```

Если файл не UTF-8 text, возвращает `415 binary_file`.

### `POST /api/vaults/{slug}/files`

Создаёт новый text file. Если файл уже существует, возвращает `400 invalid_path`.

Request:

```json
{
  "path": "note.md",
  "content": "# Note"
}
```

### `PUT /api/vaults/{slug}/files/content`

Перезаписывает text file.

Request:

```json
{
  "path": "note.md",
  "content": "# Updated"
}
```

### `POST /api/vaults/{slug}/dirs`

Создаёт директорию.

Request:

```json
{
  "path": "folder"
}
```

### `PATCH /api/vaults/{slug}/files/move`

Переименовывает или перемещает файл/директорию. Overwrite существующего destination в MVP запрещён и возвращает `400 invalid_path`.

Request:

```json
{
  "from_path": "old.md",
  "to_path": "folder/new.md"
}
```

### `DELETE /api/vaults/{slug}/files?path=note.md`

Удаляет файл или директорию.

### `POST /api/vaults/{slug}/locks`

Берёт explicit web-editor lock на файл для текущей web session.

Request:

```json
{
  "path": "note.md"
}
```

Response содержит `lock.expires_at`. Lock owner является server-generated fingerprint и не содержит raw session id.

### `POST /api/vaults/{slug}/locks/heartbeat`

Продлевает lock текущей web session.

Request:

```json
{
  "path": "note.md"
}
```

### `DELETE /api/vaults/{slug}/locks?path=note.md`

Отпускает lock текущей web session.

Lock behavior:

- запись/move/delete в файл, залоченный другой web session или WebDAV lock owner, возвращает `423 locked`;
- запись той же web session, которая держит lock, разрешена;
- операции без explicit lock берут transient lock только на время операции;
- после успешных file mutations git queue получает source `web`.

## Git

### `GET /api/vaults/{slug}/git/status`

Возвращает dirty state рабочей директории, porcelain status, длину git queue и последнюю ошибку queue.

### `GET /api/vaults/{slug}/git/commits?limit=20`

Последние коммиты vault. `limit` ограничивается сервером.

### `GET /api/vaults/{slug}/git/remote`

Возвращает remote metadata: `remote_url`, `last_push_at`, `last_push_error`.

### `PUT /api/vaults/{slug}/git/remote`

Настраивает backup remote.

Request:

```json
{
  "url": "git@host:owner/repo.git"
}
```

Ограничения:

- пустая строка отключает remote;
- URL с embedded userinfo вроде `https://user:token@host/repo.git` отклоняется;
- mdock не хранит git credentials.

### `POST /api/vaults/{slug}/git/push`

Делает manual push в remote.

Поведение:

- если remote не настроен, возвращает ошибку `remote_not_configured`;
- перед push git queue flush'ится;
- push сериализуется с другими git-операциями vault'а.

## Security Notes

- Mutating JSON API с cookie-auth требует `X-CSRF-Token`, равный cookie `mdock_csrf`.
- WebDAV использует Basic Auth и не требует CSRF.
- Пароли и session ids не возвращаются API и не должны попадать в логи.
- Все SQL-запросы используют параметры, а не строковую интерполяцию пользовательского ввода.
