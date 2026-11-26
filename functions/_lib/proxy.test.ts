import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxyToBackend } from './proxy'

afterEach(() => vi.restoreAllMocks())

describe('proxyToBackend', () => {
  it('reenvía ruta, query, método y cookie al backend', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }))

    const request = new Request('https://inbox.example.com/api/chats?x=1', {
      method: 'POST',
      headers: { cookie: 'bygrow_sid=abc', 'content-type': 'application/json' },
      body: '{"a":1}',
    })
    const response = await proxyToBackend({
      request,
      env: { BACKEND_URL: 'https://backend.example.com/' },
    })

    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://backend.example.com/api/chats?x=1')
    expect(init?.method).toBe('POST')
    const sent = new Headers(init?.headers)
    expect(sent.get('cookie')).toBe('bygrow_sid=abc')
    expect(sent.get('ngrok-skip-browser-warning')).toBe('1')
  })

  it('responde 500 si falta BACKEND_URL', async () => {
    const response = await proxyToBackend({
      request: new Request('https://inbox.example.com/api/chats'),
      env: {},
    })
    expect(response.status).toBe(500)
  })

  it('responde 502 si el backend no es alcanzable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const response = await proxyToBackend({
      request: new Request('https://inbox.example.com/media/k'),
      env: { BACKEND_URL: 'https://backend.example.com' },
    })
    expect(response.status).toBe(502)
  })
})
