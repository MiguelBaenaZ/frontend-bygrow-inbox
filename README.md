# ByGrow Inbox — Frontend

Bandeja/CRM de WhatsApp para el equipo de ByGrow. SPA interna (sin SEO ni SSR)
que consume el backend NestJS existente.

**Stack:** Vite · React 19 · TypeScript estricto · React Router v7 (modo
declarativo) · TanStack Query v5 · Tailwind CSS v4 · shadcn/ui + Radix · Lucide ·
Vitest + Testing Library.

## Requisitos

- Node.js 20 o superior
- Backend de ByGrow Inbox corriendo en `http://localhost:3100`

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local   # en PowerShell: Copy-Item .env.example .env.local
npm run dev
```

La app queda en <http://localhost:3000>.

## Variables de entorno

| Variable       | Descripción                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL` | Base de la API. Vacío = rutas relativas `/api` y `/media` (recomendado). |

Todo lo que empieza por `VITE_` es público: nunca pongas secretos ahí.
No subas `.env.local` al repositorio.

## Proxy de desarrollo

`vite.config.ts` redirige `/api` y `/media` a `http://localhost:3100`. Así el
navegador ve todo en el mismo origen (`localhost:3000`) y la cookie `HttpOnly`
de sesión funciona sin CORS.

## Scripts

| Comando             | Qué hace                    |
| ------------------- | --------------------------- |
| `npm run dev`       | Servidor de desarrollo      |
| `npm run build`     | Typecheck + build a `dist/` |
| `npm run preview`   | Sirve `dist/` localmente    |
| `npm run lint`      | ESLint sin warnings         |
| `npm run typecheck` | Verificación de tipos       |
| `npm run test`      | Vitest                      |
| `npm run format`    | Prettier                    |

## Estructura

```text
src/
  lib/          cliente API (ApiError), query keys, formato, errores
  types/api.ts  contrato de la API
  features/     auth, inbox, users, settings, layout, theme
  components/   UI reutilizable (shadcn/ui)
```

## Despliegue

`npm run build` genera `dist/`, que se sirve como estático con fallback SPA.

- **Recomendado:** mismo dominio con reverse proxy para `/api` y `/media` hacia
  el backend, y `VITE_API_URL` vacío.
- **API en otro dominio:** `VITE_API_URL=https://api.bygrow.com.co`. El backend
  debe permitir CORS con credenciales para el origen exacto del frontend y la
  cookie debe usar `SameSite=None; Secure`. Ajusta `connect-src`, `img-src` y
  `media-src` en `public/_headers`.
- **Cloudflare (Workers con assets):** ver la sección siguiente. El fallback SPA
  está en `wrangler.jsonc` y `public/_headers` trae la CSP.
- **Netlify:** añade un `_redirects` con `/* /index.html 200`.
- **Nginx:** `try_files $uri $uri/ /index.html;`

## Despliegue en Cloudflare (Workers con assets y proxy)

El proyecto se despliega como un Worker (`wrangler.jsonc`) que sirve `dist/` con
fallback SPA. Solo `/api/*` y `/media/*` pasan por `worker/index.ts`, que las
reenvía al backend. El navegador habla con un solo dominio, así que la cookie de
sesión funciona sin CORS y `VITE_API_URL` se deja vacío.

1. Conecta el repositorio de GitHub en **Workers & Pages → Create → Import a
   repository**.
2. Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
3. En **Settings → Variables and Secrets** define `BACKEND_URL` (sin barra final):
   - Mientras el backend corra en tu PC: la URL fija del túnel de ngrok.
   - Con el backend desplegado: `https://api.bygrow.com.co`.
4. Cambiar de backend es solo editar `BACKEND_URL` y volver a desplegar
   (`keep_vars` conserva la variable entre despliegues).
5. Dominio propio: **Settings → Domains & Routes → Add → Custom domain**.
6. El backend debe aceptar el dominio del frontend como origen permitido
   (su middleware de mismo origen y la lista de CORS).

La URL del backend no está en el código: solo vive en esa variable.

## Política de dependencias

- `package-lock.json` versionado; en CI se usa `npm ci`, no `npm install`.
- Versiones fijas (sin `^` ni `~`).
- `npm audit --omit=dev` en CI y Dependabot semanal.
- Revisa los scripts `postinstall` antes de agregar un paquete.
- Cada dependencia nueva requiere justificación escrita y aprobación.
- Prefiere APIs nativas: `fetch`, `Intl`, `URL`, `FormData`.
- **Prohibidas:** Next.js, Remix, React Hook Form, Zod/Yup/Valibot, date-fns,
  dayjs, moment, Zustand, Redux, Jotai, Recoil, SWR, MUI, Ant Design, Chakra.
  El único sistema de toast es Sonner, instalado por shadcn/ui.

Umbrales para reconsiderar: React Hook Form (formularios de más de 5 campos o
campos dinámicos), Zod (reglas compartidas), date-fns (cálculos de fechas, no
solo formato), Zustand (estado de UI compartido en más de 4 pantallas).

## Seguridad

- Sesión en cookie `HttpOnly`; el frontend nunca la lee ni la guarda.
- `credentials: 'include'` solo hacia la API.
- Sin `dangerouslySetInnerHTML`.
- Los guards de ruta son solo UX; el backend autoriza.
- `localStorage` guarda únicamente la preferencia de tema.
