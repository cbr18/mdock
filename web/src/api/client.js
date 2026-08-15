export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const csrfToken = isSafeMethod(method) ? '' : getCookie('mdock_csrf');
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  let payload = null;
  const text = await response.text();
  if (text) {
    payload = JSON.parse(text);
  }
  if (!response.ok) {
    const error = new Error(payload?.error || 'request_failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function isSafeMethod(method) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
}
