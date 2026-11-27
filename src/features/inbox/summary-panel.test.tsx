import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SummaryPanel } from '@/features/inbox/summary-panel'
import type { ConversationSummary } from '@/types/api'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const NOW = 1_700_000_300_000

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function installFetch(handler: () => Promise<Response>) {
  const fetchMock = vi.fn(handler)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPanel(summary: ConversationSummary | null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <SummaryPanel chatId="chat-1" summary={summary} now={NOW} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SummaryPanel', () => {
  it('muestra el resumen largo completo y permite expandirlo', async () => {
    const longSummary = Array.from(
      { length: 10 },
      (_, index) => `Línea ${index + 1}: el cliente contó su situación.`,
    ).join('\n')

    renderPanel({
      summary: longSummary,
      summaryUpdatedAt: NOW - 5 * 60_000,
      summaryThroughSeq: 42,
    })

    const browser = userEvent.setup()
    const text = screen.getByTestId('summary-text')

    expect(text.textContent).toBe(longSummary)
    expect(text).toHaveClass('whitespace-pre-wrap')
    expect(text).toHaveClass('max-h-36')
    expect(screen.getByText('Actualizado hace 5 min')).toBeInTheDocument()

    await browser.click(screen.getByRole('button', { name: 'Ver resumen completo' }))

    expect(text.textContent).toBe(longSummary)
    expect(text).not.toHaveClass('max-h-36')
    expect(screen.getByRole('button', { name: 'Contraer resumen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('muestra el estado vacío cuando todavía no hay resumen', () => {
    renderPanel(null)

    expect(
      screen.getByText('Aún no hay resumen: se genera después de unos mensajes.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('summary-text')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerar resumen' })).toBeInTheDocument()
  })

  it('avisa si el servidor no pudo regenerar el resumen', async () => {
    installFetch(async () => jsonResponse({ ok: false, summary: null }))
    renderPanel(null)

    const browser = userEvent.setup()
    await browser.click(screen.getByRole('button', { name: 'Regenerar resumen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo regenerar el resumen. Inténtalo de nuevo.',
    )
  })
})
