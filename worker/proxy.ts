/**
 * Proxy same-origin hacia el backend.
 *
 * El navegador solo habla con el dominio de Pages; esta función reenvía
 * /api y /media a BACKEND_URL (variable de entorno de Cloudflare Pages).
 * Así la cookie de sesión HttpOnly queda ligada al dominio del frontend
 * y no hace falta CORS.
 */

export interface Env {
  /** URL base del backend, sin barra final. Ej.: https://api.bygrow.com.co */
  BACKEND_URL?: string
}

export interface ProxyContext {
  request: Request
  env: Env
}

const HOP_BY_HOP = ['host', 'connection', 'content-length', 'cf-connecting-ip']

export async function proxyToBackend({ request, env }: ProxyContext): Promise<Response> {
  const base = env.BACKEND_URL?.trim().replace(/\/$/, '')
  if (!base) {
    return Response.json(
      { error: 'backend_not_configured', message: 'BACKEND_URL no está definida.' },
      { status: 500 },
    )
  }

  const incoming = new URL(request.url)
  const target = `${base}${incoming.pathname}${incoming.search}`

  const headers = new Headers(request.headers)
  for (const name of HOP_BY_HOP) headers.delete(name)
  // El túnel gratuito de ngrok muestra una página de aviso a los clientes
  // que no envían este encabezado; rompería las llamadas JSON.
  headers.set('ngrok-skip-browser-warning', '1')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    })
  } catch {
    return Response.json(
      { error: 'backend_unreachable', message: 'No se pudo conectar con el servidor.' },
      { status: 502 },
    )
  }
}
