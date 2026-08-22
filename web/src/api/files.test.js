import { afterEach, describe, expect, test, vi } from 'vitest';
import { releaseFileLockKeepalive } from './files.js';

describe('files api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'mdock_csrf=; Max-Age=0; path=/';
  });

  test('sends keepalive lock release with owner and csrf token', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'mdock_csrf=csrf-token; path=/';

    releaseFileLockKeepalive('vault slug', 'dir/note.md', 'tab-a');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vaults/vault%20slug/locks?path=dir%2Fnote.md&owner=tab-a',
      {
        method: 'DELETE',
        credentials: 'same-origin',
        keepalive: true,
        headers: {
          'X-CSRF-Token': 'csrf-token'
        }
      }
    );
  });
});
