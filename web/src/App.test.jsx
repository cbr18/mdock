import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

test('renders auth form when session is absent', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'unauthorized' }, 401)));

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'mdock' })).toBeInTheDocument();
  expect(screen.getByLabelText('Логин')).toBeInTheDocument();
  expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
});

test('logs in and shows vault webdav url', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ error: 'unauthorized' }, 401);
    }
    if (url === '/api/auth/login') {
      return response({ status: 'ok', username: 'alice' });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [{ id: 1, slug: 'alice', kind: 'personal', role: 'owner' }] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [] });
    }
    return response({}, 404);
  }));

  render(<App />);

  fireEvent.change(await screen.findByLabelText('Логин'), { target: { value: 'alice' } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Хранилища' })).toBeInTheDocument());
  expect(screen.getByDisplayValue('http://localhost:3000/webdav/alice/')).toBeInTheDocument();
});

test('persists selected theme and accent', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [] });
    }
    return response({}, 404);
  }));

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByLabelText('Настройки темы'));
  fireEvent.click(screen.getByRole('button', { name: 'Белый' }));
  fireEvent.click(screen.getByLabelText('Синий'));

  expect(localStorage.getItem('mdock.theme')).toBe('light');
  expect(localStorage.getItem('mdock.accent')).toBe('blue');
  expect(document.querySelector('.theme-root')).toHaveAttribute('data-theme', 'light');
  expect(document.querySelector('.theme-root')).toHaveAttribute('data-accent', 'blue');
});

test('resets scroll position on internal navigation', async () => {
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [] });
    }
    return response({}, 404);
  }));

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByRole('link', { name: 'Аккаунт' }));

  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
});

test('opens archive tab and restores archived vault', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [{ id: 2, slug: 'old-notes', name: 'Old Notes', kind: 'shared', role: 'owner', archived: true }] });
    }
    return response({}, 404);
  }));

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByRole('tab', { name: 'Архив' }));

  expect(screen.getByRole('heading', { name: 'Old Notes' })).toBeInTheDocument();
});

test('supports browser back after opening a vault', async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [{ id: 1, slug: 'work-notes', name: 'Work Notes', kind: 'shared', role: 'owner' }] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults/work-notes') {
      return response({ vault: { id: 1, slug: 'work-notes', name: 'Work Notes', path: 'vault-1', kind: 'shared', role: 'owner', archived: false } });
    }
    if (url === '/api/vaults/work-notes/members') {
      return response({ members: [] });
    }
    if (url === '/api/vaults/work-notes/git/status') {
      return response({ dirty: false, queue_len: 0 });
    }
    if (url === '/api/vaults/work-notes/git/commits?limit=20') {
      return response({ commits: [] });
    }
    if (url === '/api/vaults/work-notes/git/remote') {
      return response({ remote_url: '', last_push_at: '', last_push_error: '' });
    }
    if (url === '/api/vaults/work-notes/webdav') {
      return response({ webdav: { url: 'http://localhost:3000/webdav/work-notes/' } });
    }
    if (url === '/api/vaults/work-notes/files?path=.') {
      return response({ entries: [] });
    }
    return response({}, 404);
  }));

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByRole('button', { name: /Work Notes/ }));
  expect(await screen.findByLabelText('Хлебные крошки')).toBeInTheDocument();
  expect(window.location.search).toBe('?page=vault&slug=work-notes');

  window.history.back();
  window.dispatchEvent(new PopStateEvent('popstate'));

  expect(await screen.findByRole('heading', { name: 'Хранилища' })).toBeInTheDocument();
});

test('renders vault file list and markdown preview', async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  let rootEntries = [
    { name: 'folder', path: 'folder', is_dir: true, size: 0, mod_time: '2026-08-15T10:00:00Z' },
    { name: 'note.md', path: 'note.md', is_dir: false, size: 41, mod_time: '2026-08-15T10:00:00Z' }
  ];
  let docsEntries = [];
  const fetchMock = vi.fn(async (url, options = {}) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [{ id: 1, slug: 'work-notes', name: 'Work Notes', kind: 'shared', role: 'owner' }] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults/work-notes') {
      return response({ vault: { id: 1, slug: 'work-notes', name: 'Work Notes', path: 'vault-1', kind: 'shared', role: 'owner', archived: false } });
    }
    if (url === '/api/vaults/work-notes/members') {
      return response({ members: [] });
    }
    if (url === '/api/vaults/work-notes/git/status') {
      return response({ dirty: false, queue_len: 0 });
    }
    if (url === '/api/vaults/work-notes/git/commits?limit=20') {
      return response({ commits: [] });
    }
    if (url === '/api/vaults/work-notes/git/remote') {
      return response({ remote_url: '', last_push_at: '', last_push_error: '' });
    }
    if (url === '/api/vaults/work-notes/webdav') {
      return response({ webdav: { url: 'http://localhost:3000/webdav/work-notes/' } });
    }
    if (url === '/api/vaults/work-notes/files?path=.') {
      return response({
        entries: rootEntries
      });
    }
    if (url === '/api/vaults/work-notes/files?path=folder') {
      return response({
        entries: [
          { name: 'child.md', path: 'folder/child.md', is_dir: false, size: 8, mod_time: '2026-08-15T10:30:00Z' }
        ]
      });
    }
    if (url === '/api/vaults/work-notes/files?path=docs') {
      return response({ entries: docsEntries });
    }
    if (url === '/api/vaults/work-notes/files' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      rootEntries = [...rootEntries, { name: body.path.split('/').pop(), path: body.path, is_dir: false, size: 0, mod_time: '2026-08-15T11:00:00Z' }];
      return response({ path: body.path }, 201);
    }
    if (url === '/api/vaults/work-notes/dirs' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      rootEntries = [...rootEntries, { name: body.path.split('/').pop(), path: body.path, is_dir: true, size: 0, mod_time: '2026-08-15T11:00:00Z' }];
      return response({ path: body.path }, 201);
    }
    if (url === '/api/vaults/work-notes/files?path=draft.md' && options.method === 'DELETE') {
      rootEntries = rootEntries.filter((entry) => entry.path !== 'draft.md');
      return response({ status: 'ok' });
    }
    if (url === '/api/vaults/work-notes/files/move' && options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      if (body.from_path === 'move-me.md' && body.to_path === 'docs/move-me.md') {
        rootEntries = rootEntries.filter((entry) => entry.path !== 'move-me.md');
        docsEntries = [...docsEntries, { name: 'move-me.md', path: 'docs/move-me.md', is_dir: false, size: 0, mod_time: '2026-08-15T12:00:00Z' }];
        return response({ status: 'ok' });
      }
      return response({ error: 'bad move' }, 400);
    }
    if (url === '/api/vaults/work-notes/files/content?path=note.md') {
      return response({ content: '---\ntags: [test]\n---\n# Note\n\n**bold** [site](https://example.test) [[Page|Alias]]\n\n- [x] done\n- item\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n---' });
    }
    if (url === '/api/vaults/work-notes/files/content?path=folder%2Fchild.md') {
      return response({ content: '# Child' });
    }
    if (url === '/api/vaults/work-notes/locks') {
      return response({ lock: { path: 'note.md', source: 'web' } });
    }
    return response({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window, 'prompt')
    .mockReturnValueOnce('draft')
    .mockReturnValueOnce('docs')
    .mockReturnValueOnce('move-me');
  vi.spyOn(window, 'confirm').mockReturnValue(true);

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByRole('button', { name: /Work Notes/ }));
  expect(await screen.findByRole('button', { name: 'note.md' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'note.md' }));

  expect(await screen.findByRole('heading', { name: 'Note' })).toBeInTheDocument();
  expect(screen.getByText('tags: [test]')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { checked: true })).toBeChecked();
  expect(screen.getByLabelText('Редактирование')).not.toBeChecked();
  expect(screen.queryByLabelText('Markdown-редактор')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  expect(fetchMock).not.toHaveBeenCalledWith('/api/vaults/work-notes/locks', expect.anything());

  fireEvent.click(screen.getByRole('button', { name: 'Раскрыть папку: folder' }));
  expect(await screen.findByRole('button', { name: 'child.md' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'child.md' }));
  expect(await screen.findByRole('heading', { name: 'Child' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Выше' }));
  fireEvent.click(screen.getByRole('button', { name: 'note.md' }));
  expect(await screen.findByRole('heading', { name: 'Note' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Скрыть файлы' }));
  expect(screen.getByRole('button', { name: 'Показать файлы' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Показать файлы' }));
  expect(screen.getByRole('button', { name: 'Скрыть файлы' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Создать файл' }));
  expect(await screen.findByRole('button', { name: 'draft.md' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/vaults/work-notes/files', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ path: 'draft.md', content: '' })
  }));

  fireEvent.click(screen.getByRole('button', { name: 'Создать папку' }));
  expect(await screen.findByRole('button', { name: 'docs' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/vaults/work-notes/dirs', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ path: 'docs' })
  }));

  fireEvent.click(screen.getByRole('button', { name: 'Удалить файл: draft.md' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/vaults/work-notes/files?path=draft.md', expect.objectContaining({ method: 'DELETE' })));

  fireEvent.click(screen.getByRole('button', { name: 'Создать файл' }));
  expect(await screen.findByRole('button', { name: 'move-me.md' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Переместить: move-me.md' }));
  expect(screen.getByText('Перемещаем: move-me.md')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Переместить сюда: docs' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/vaults/work-notes/files/move', expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ from_path: 'move-me.md', to_path: 'docs/move-me.md' })
  })));
  expect(await screen.findByRole('button', { name: 'Свернуть папку: docs' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'move-me.md' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Исходник' }));
  expect((await screen.findAllByLabelText('Markdown-редактор')).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  expect(window.location.search).toContain('view=plain');

  fireEvent.click(screen.getByLabelText('Редактирование'));
  expect(await screen.findByText('Lock активен')).toBeInTheDocument();
  expect((await screen.findAllByRole('button', { name: 'Сохранить' })).length).toBeGreaterThanOrEqual(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/vaults/work-notes/locks', expect.anything());

  fireEvent.click(screen.getByRole('button', { name: 'Абзац' }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
  expect(screen.getAllByText('Не реализовано пока').length).toBeGreaterThanOrEqual(1);

  fireEvent.click(screen.getByRole('tab', { name: 'Две панели' }));
  expect(screen.getAllByText('tags: [test]').length).toBeGreaterThanOrEqual(1);
  expect((await screen.findAllByLabelText('Markdown-редактор')).length).toBeGreaterThanOrEqual(1);
  expect(window.location.search).toContain('view=split');

  fireEvent.click(screen.getByRole('tab', { name: 'Просмотр' }));
  expect((await screen.findAllByLabelText('Markdown-редактор')).length).toBeGreaterThanOrEqual(1);
  await waitFor(() => expect(document.querySelector('.cm-live-preview')).toBeInTheDocument());
  await waitFor(() => expect(document.querySelector('.cm-live-rendered-block h1')).toHaveTextContent('Note'));
  expect(document.querySelector('.cm-live-rendered-block strong')).toHaveTextContent('bold');
  expect(document.querySelector('.cm-live-rendered-block a')).toHaveTextContent('site');
  expect(document.querySelector('.cm-live-rendered-block ul')).toBeInTheDocument();
  expect(document.querySelector('.cm-live-rendered-block input[type="checkbox"]')).toBeChecked();
  expect(document.querySelector('.cm-live-rendered-block table')).toBeInTheDocument();
  expect(document.querySelector('.cm-live-rendered-block hr')).toBeInTheDocument();
  expect(screen.queryByText('Live Preview editing ещё не реализован')).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Сохранить' }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByLabelText('Метаданные')).toBeInTheDocument();
  expect(screen.getByText('tags: [test]')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Настройки хранилища' }));
  expect(await screen.findByRole('heading', { name: 'Хранилище' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Статус Git' })).toBeInTheDocument();
  expect(window.location.search).toContain('section=settings');
});

test('does not load files for archived vault page', async () => {
  const fetchMock = vi.fn(async (url) => {
    if (url === '/api/auth/me') {
      return response({ username: 'admin', is_admin: true });
    }
    if (url === '/api/vaults') {
      return response({ vaults: [] });
    }
    if (url === '/api/vaults?archived=only') {
      return response({ vaults: [{ id: 2, slug: 'old-notes', name: 'Old Notes', kind: 'shared', role: 'owner', archived: true }] });
    }
    if (url === '/api/vaults/old-notes') {
      return response({ vault: { id: 2, slug: 'old-notes', name: 'Old Notes', path: 'vault-2', kind: 'shared', role: 'owner', archived: true } });
    }
    if (url === '/api/vaults/old-notes/members') {
      return response({ members: [] });
    }
    return response({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await screen.findByRole('heading', { name: 'Хранилища' });
  fireEvent.click(screen.getByRole('tab', { name: 'Архив' }));
  fireEvent.click(await screen.findByRole('button', { name: /Old Notes/ }));

  expect(await screen.findByText('Архивное хранилище скрыто от рабочих Git/WebDAV операций.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Файлы' })).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalledWith('/api/vaults/old-notes/files?path=.', expect.anything());
});

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}
