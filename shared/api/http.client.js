import fetch from 'node-fetch';

export async function request(method, url, body = null, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });

  const json = await response.json();
  return { status: response.status, body: json };
}
