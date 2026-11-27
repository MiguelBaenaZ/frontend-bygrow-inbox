import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AiSettingsPage } from '@/features/ai-settings/ai-settings-page'
import type {
  AiSettings,
  AiSettingsLimits,
  AiSettingsMessages,
  AiSettingsResponse,
} from '@/types/api'

const limits: AiSettingsLimits = {
  short: 200,
  medium: 1000,
  long: 6000,
  maxServices: 50,
  maxRules: 30,
  ruleLength: 300,
}

const defaultMessages: AiSettingsMessages = {
  handoff: 'Te paso con un asesor para que te ayude.',
  technicalError: 'Tuvimos un problema técnico. Inténtalo de nuevo.',
  audioFailed: 'No pude escuchar la nota de voz. ¿Me lo escribes?',
  unsupported: 'Por ahora solo puedo leer mensajes de texto.',
  fallback: 'Déjame verificar esa información y te confirmo.',
}

function baseSettings(overrides: Partial<AiSettings> = {}): AiSettings {
  return {
    assistantName: 'Asistente ByGrow',
    businessName: 'ByGrow',
    businessDescription: 'Agencia de crecimiento',
    personality: '',
    businessHours: 'Lunes a viernes, 8:00 a. m. a 6:00 p. m.',
    services: [],
    knowledge: '',
    rules: [],
    extraInstructions: '',
    messages: {
      handoff: '',
      technicalError: '',
      audioFailed: '',
      unsupported: '',
      fallback: '',
    },
    replyDelay: { minSeconds: 4, maxSeconds: 9 },
    model: '',
    temperature: null,
    maxTokens: null,
    ...overrides,
  }
}

function settingsResponse(settings = baseSettings()): AiSettingsResponse {
  return {
    ok: true,
    settings,
    version: 3,
    updatedAt: Date.now() - 120_000,
    defaults: { messages: defaultMessages },
    limits,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const fetchMock = vi.fn(handler)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createMemoryRouter(
    [
      { path: '/ajustes/asistente', element: <AiSettingsPage /> },
      { path: '/inbox', element: <div>Bandeja</div> },
    ],
    { initialEntries: ['/ajustes/asistente'] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { router }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AiSettingsPage', () => {
  it('habilita Guardar solo con cambios y sin errores de validación', async () => {
    installFetch(async () => jsonResponse(settingsResponse()))
    renderPage()
    const browser = userEvent.setup()

    const nameInput = await screen.findByLabelText('Nombre del asistente')
    const saveButton = screen.getByRole('button', { name: 'Guardar' })

    expect(saveButton).toBeDisabled()

    await browser.clear(nameInput)
    await browser.type(nameInput, 'Asistente comercial')
    expect(saveButton).toBeEnabled()

    await browser.clear(nameInput)
    await browser.type(nameInput, 'a'.repeat(limits.short + 1))
    expect(saveButton).toBeDisabled()
    expect(screen.getByText('Hay un campo por corregir.')).toBeInTheDocument()
  })

  it('pide confirmación antes de salir con cambios sin guardar', async () => {
    installFetch(async () => jsonResponse(settingsResponse()))
    const { router } = renderPage()
    const browser = userEvent.setup()

    const nameInput = await screen.findByLabelText('Nombre del asistente')
    await browser.type(nameInput, '!')

    await act(async () => {
      void router.navigate('/inbox')
    })

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Cambios sin guardar')).toBeInTheDocument()

    await browser.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(router.state.location.pathname).toBe('/ajustes/asistente')
    expect(screen.getByLabelText('Nombre del asistente')).toHaveValue('Asistente ByGrow!')
  })

  it('envía el payload normalizado y muestra la versión confirmada por el servidor', async () => {
    const fetchMock = installFetch(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/ai-settings') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as AiSettings
        return jsonResponse({
          ok: true,
          settings: body,
          version: 4,
          updatedAt: Date.now(),
        })
      }
      if (url.endsWith('/api/ai-settings')) {
        return jsonResponse(settingsResponse())
      }
      return jsonResponse({ error: 'not_found' }, 404)
    })

    renderPage()
    const browser = userEvent.setup()
    const nameInput = await screen.findByLabelText('Nombre del asistente')

    await browser.clear(nameInput)
    await browser.type(nameInput, '  Asistente comercial  ')
    await browser.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Configuración guardada correctamente.')).toBeInTheDocument()

    const putCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
    )
    expect(putCall).toBeDefined()
    const payload = JSON.parse(String((putCall?.[1] as RequestInit).body)) as AiSettings

    expect(payload.assistantName).toBe('Asistente comercial')
    expect(payload.businessName).toBe('ByGrow')
    expect(payload.temperature).toBeNull()
    expect(payload.maxTokens).toBeNull()
    expect(payload.services).toEqual([])
    expect(payload.rules).toEqual([])

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Versión 4')
  })

  it('muestra el aviso de permisos y conserva lo escrito ante un 403', async () => {
    installFetch(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/ai-settings') && init?.method === 'PUT') {
        return jsonResponse({ error: 'forbidden' }, 403)
      }
      return jsonResponse(settingsResponse())
    })

    renderPage()
    const browser = userEvent.setup()
    const nameInput = await screen.findByLabelText('Nombre del asistente')

    await browser.clear(nameInput)
    await browser.type(nameInput, 'Asistente propio')
    await browser.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('No tienes permiso para esta acción.')).toBeInTheDocument()
    expect(nameInput).toHaveValue('Asistente propio')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('muestra el error y los detalles de validación ante un 400', async () => {
    installFetch(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/ai-settings') && init?.method === 'PUT') {
        return jsonResponse(
          {
            error: 'Hay datos inválidos',
            details: [
              'El nombre del asistente no puede superar 200 caracteres',
              'Revisa el modelo configurado',
            ],
          },
          400,
        )
      }
      return jsonResponse(settingsResponse())
    })

    renderPage()
    const browser = userEvent.setup()
    const nameInput = await screen.findByLabelText('Nombre del asistente')

    await browser.clear(nameInput)
    await browser.type(nameInput, 'Asistente propio')
    await browser.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Hay datos inválidos')).toBeInTheDocument()
    expect(
      screen.getByText('El nombre del asistente no puede superar 200 caracteres'),
    ).toBeInTheDocument()
    expect(screen.getByText('Revisa el modelo configurado')).toBeInTheDocument()
    expect(nameInput).toHaveValue('Asistente propio')

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Hay datos inválidos')).toBeInTheDocument()
  })

  it('ajusta y limita el tiempo de respuesta, y lo envía al guardar', async () => {
    const fetchMock = installFetch(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/ai-settings') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as AiSettings
        return jsonResponse({
          ok: true,
          settings: body,
          version: 4,
          updatedAt: Date.now(),
        })
      }
      if (url.endsWith('/api/ai-settings')) {
        return jsonResponse(settingsResponse())
      }
      return jsonResponse({ error: 'not_found' }, 404)
    })

    renderPage()
    const browser = userEvent.setup()
    const minInput = await screen.findByLabelText('Mínimo')
    const maxInput = screen.getByLabelText('Máximo')

    expect(minInput).toHaveValue(4)
    expect(maxInput).toHaveValue(9)
    expect(
      screen.getByRole('status', { name: 'Vista previa del tiempo de respuesta' }),
    ).toHaveTextContent('Responderá entre 4 y 9 segundos después de recibir el mensaje.')

    await browser.clear(minInput)
    await browser.type(minInput, '10')
    expect(minInput).toHaveValue(10)
    expect(maxInput).toHaveValue(10)

    await browser.clear(maxInput)
    await browser.type(maxInput, '3')
    expect(minInput).toHaveValue(10)
    expect(maxInput).toHaveValue(10)

    await browser.clear(minInput)
    await browser.type(minInput, '30')
    expect(minInput).toHaveValue(25)
    expect(maxInput).toHaveValue(25)

    await browser.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Configuración guardada correctamente.')).toBeInTheDocument()

    const putCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
    )
    expect(putCall).toBeDefined()
    const payload = JSON.parse(String((putCall?.[1] as RequestInit).body)) as AiSettings
    expect(payload.replyDelay).toEqual({ minSeconds: 25, maxSeconds: 25 })
  })

  it('aplica los atajos Inmediato y Restablecer al tiempo de respuesta', async () => {
    installFetch(async () => jsonResponse(settingsResponse()))
    renderPage()
    const browser = userEvent.setup()
    const minInput = await screen.findByLabelText('Mínimo')
    const maxInput = screen.getByLabelText('Máximo')

    await browser.click(screen.getByRole('button', { name: 'Inmediato' }))
    expect(minInput).toHaveValue(0)
    expect(maxInput).toHaveValue(0)
    expect(
      screen.getByRole('status', { name: 'Vista previa del tiempo de respuesta' }),
    ).toHaveTextContent('Responderá entre 0 y 0 segundos después de recibir el mensaje.')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()

    await browser.click(screen.getByRole('button', { name: 'Restablecer' }))
    expect(minInput).toHaveValue(4)
    expect(maxInput).toHaveValue(9)
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
  })

  it('restaura una versión antigua sin tiempo de respuesta usando 4 y 9', async () => {
    const legacySettings = baseSettings()
    delete (legacySettings as Partial<AiSettings>).replyDelay

    installFetch(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/ai-settings/history')) {
        return jsonResponse({
          ok: true,
          versions: [
            {
              version: 2,
              updatedAt: Date.now() - 60_000,
              updatedBy: 'user-1',
              email: 'admin@bygrow.com',
            },
          ],
        })
      }
      if (url.includes('/api/ai-settings/restore/2')) {
        return jsonResponse({
          ok: true,
          settings: legacySettings,
          version: 5,
          updatedAt: Date.now(),
        })
      }
      return jsonResponse(settingsResponse())
    })

    renderPage()
    const browser = userEvent.setup()
    await screen.findByLabelText('Nombre del asistente')

    await browser.click(screen.getByRole('button', { name: 'Historial' }))
    await browser.click(await screen.findByRole('button', { name: 'Restaurar' }))
    await browser.click(await screen.findByRole('button', { name: 'Restaurar versión' }))

    expect(await screen.findByText('Versión restaurada correctamente.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mínimo')).toHaveValue(4)
    expect(screen.getByLabelText('Máximo')).toHaveValue(9)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})
