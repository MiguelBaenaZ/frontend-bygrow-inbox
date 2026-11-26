import { proxyToBackend, type Env } from './proxy'

/**
 * Worker con assets estáticos.
 *
 * Cloudflare sirve `dist/` directamente (con fallback SPA). Solo las rutas
 * /api/* y /media/* (ver `run_worker_first` en wrangler.jsonc) llegan aquí
 * y se reenvían al backend.
 */
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return proxyToBackend({ request, env })
  },
}
