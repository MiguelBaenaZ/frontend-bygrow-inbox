import { describe, expect, it } from 'vitest'

import {
  contactName,
  filterChats,
  lastMessagePreview,
  summaryPreview,
  summarizeChats,
} from '@/features/inbox/inbox-utils'
import type { ChatSummary } from '@/types/api'

function chat(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return {
    user_id: '573022386856',
    phone: '573022386856',
    name: 'Yane',
    username: null,
    last_seen_at: 1_700_000_000_000,
    opt_in: false,
    opt_out: false,
    opt_in_at: null,
    opt_out_at: null,
    opt_in_source: null,
    opt_out_source: null,
    status: 'bot',
    summary: null,
    updated_at: 1_700_000_000_000,
    last_inbound_at: 1_700_000_000_000,
    lead_stage: 'nuevo',
    followup_sent_at: null,
    last_body: 'Hola, quiero saber más',
    last_dir: 'in',
    last_kind: 'text',
    window_open: true,
    ...overrides,
  }
}

describe('inbox-utils', () => {
  it('usa nombre, teléfono o id como identidad visible', () => {
    expect(contactName(chat())).toBe('Yane')
    expect(contactName(chat({ name: null }))).toBe('573022386856')
  })

  it('filtra por estado, ventana, opt-out y búsqueda', () => {
    const chats = [
      chat(),
      chat({
        user_id: 'CO.111',
        phone: null,
        name: 'Miguel Baena',
        status: 'humano',
        window_open: false,
        opt_out: true,
        last_body: 'Quedamos en cuadrar el diagnóstico',
      }),
    ]

    expect(filterChats(chats, 'bot', '')).toHaveLength(1)
    expect(filterChats(chats, 'humano', '')).toHaveLength(1)
    expect(filterChats(chats, 'closed', '')).toHaveLength(1)
    expect(filterChats(chats, 'optout', '')).toHaveLength(1)
    expect(filterChats(chats, 'all', 'diagnostico')).toHaveLength(1)
    expect(filterChats(chats, 'all', 'sin coincidencia')).toHaveLength(0)
  })

  it('resume la cola y el último mensaje', () => {
    const chats = [chat(), chat({ last_dir: 'out', last_body: 'Te comparto el plan' })]
    expect(lastMessagePreview(chats[0]!)).toBe('Hola, quiero saber más')
    expect(lastMessagePreview(chats[1]!)).toBe('Tú: Te comparto el plan')
    expect(summarizeChats(chats)).toEqual({
      total: 2,
      waiting: 1,
      closedWindows: 0,
      optedOut: 0,
    })
  })

  it('prepara una vista previa corta del resumen para la lista', () => {
    expect(summaryPreview('Resumen corto')).toBe('Resumen corto')
    expect(summaryPreview(null)).toBe('')
    expect(summaryPreview('**Uno**\n\n- Dos', 100)).toBe('Uno Dos')

    const preview = summaryPreview('a'.repeat(50), 20)
    expect(preview).toBe(`${'a'.repeat(20)}…`)
  })
})
