import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MessageBubble } from '@/features/inbox/message-bubble'
import type { ThreadMessage } from '@/types/api'

function message(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return {
    id: 'message-1',
    wamid: 'wamid-1',
    direction: 'in',
    kind: 'text',
    body: 'Hola, quiero saber más',
    status: 'received',
    media_key: null,
    created_at: 1_700_000_000_000,
    ...overrides,
  }
}

describe('MessageBubble', () => {
  it('muestra el texto entrante', () => {
    render(
      <MessageBubble
        message={message()}
        isAdmin={false}
        onRequestDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Hola, quiero saber más')).toBeInTheDocument()
  })

  it('etiqueta las plantillas y anuncia el estado de salida', () => {
    render(
      <MessageBubble
        message={message({
          direction: 'out',
          kind: 'template',
          body: '[plantilla seguimiento] Hola',
          status: 'read',
        })}
        isAdmin={false}
        onRequestDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Plantilla')).toBeInTheDocument()
    expect(screen.getByText(/Leído/)).toBeInTheDocument()
  })

  it('carga las imágenes de WhatsApp desde /media', () => {
    render(
      <MessageBubble
        message={message({
          kind: 'image',
          body: '[foto enviada] Propuesta',
          media_key: 'foto-1.jpg',
        })}
        isAdmin={false}
        onRequestDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('img', { name: 'Imagen recibida' })).toHaveAttribute(
      'src',
      '/media/foto-1.jpg',
    )
  })
})
