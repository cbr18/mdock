import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    return response({}, 404);
  }));

  render(<App />);

  fireEvent.change(await screen.findByLabelText('Логин'), { target: { value: 'alice' } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Vaults' })).toBeInTheDocument());
  expect(screen.getByDisplayValue('http://localhost:3000/webdav/alice/')).toBeInTheDocument();
});

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}
