import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

import { ProfileCard } from '@/features/inbox/profile-card'
import type { ChatProfile } from '@/types/api'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function profile(overrides: Partial<ChatProfile> = {}): ChatProfile {
  return {
    name: 'Yane Rodríguez',
    company: 'ByGrow',
    business: 'Agencia de crecimiento',
    customers: 'Pymes de servicios',
    channels: 'Instagram y referidos',
    city: 'Bogotá',
    email: 'yane@bygrow.com',
    pains: ['No tiene presencia digital'],
    interests: ['Automatización de WhatsApp'],
    notes: ['Prefiere contacto por la tarde'],
    ...overrides,
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

function renderCard(value: ChatProfile) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ProfileCard chatId="chat-1" profile={value} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('ProfileCard', () => {
  it('envía en el PATCH solo los campos que cambiaron', async () => {
    const base = profile()
    const updated = { ...base, company: 'Nueva empresa' }
    const fetchMock = installFetch(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/chats/chat-1/profile') && init?.method === 'PATCH') {
        return jsonResponse({ ok: true, profile: updated })
      }
      return jsonResponse({ error: 'not_found' }, 404)
    })

    renderCard(base)
    const browser = userEvent.setup()

    await browser.click(screen.getByRole('button', { name: 'Editar' }))
    const companyInput = screen.getByLabelText('Empresa')
    await browser.clear(companyInput)
    await browser.type(companyInput, 'Nueva empresa')

    const saveButton = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(saveButton).toBeEnabled()
    await browser.click(saveButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const call = fetchMock.mock.calls[0]!
    expect(String(call[0])).toBe('/api/chats/chat-1/profile')
    expect((call[1] as RequestInit).method).toBe('PATCH')

    const body = JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>
    expect(body).toEqual({ company: 'Nueva empresa' })
    expect(Object.keys(body)).toEqual(['company'])

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Datos del cliente actualizados'),
    )
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('oculta en lectura los campos vacíos y las listas sin elementos', () => {
    renderCard(
      profile({
        company: '',
        city: '',
        email: '',
        pains: [],
        interests: [],
        notes: [],
      }),
    )

    expect(screen.getByText('Yane Rodríguez')).toBeInTheDocument()
    expect(screen.getByText('Agencia de crecimiento')).toBeInTheDocument()
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument()
    expect(screen.queryByText('Ciudad')).not.toBeInTheDocument()
    expect(screen.queryByText('Correo')).not.toBeInTheDocument()
    expect(screen.queryByText('Problemas')).not.toBeInTheDocument()
    expect(screen.queryByText('Servicios de interés')).not.toBeInTheDocument()
    expect(screen.queryByText('Notas')).not.toBeInTheDocument()
  })

  it('muestra un estado vacío cuando la ficha no tiene datos', () => {
    renderCard(
      profile({
        name: '',
        company: '',
        business: '',
        customers: '',
        channels: '',
        city: '',
        email: '',
        pains: [],
        interests: [],
        notes: [],
      }),
    )

    expect(
      screen.getByText('Aún no hay datos del cliente. Usa «Editar» para agregarlos.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })
})
