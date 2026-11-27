import { normalizeSearch } from '@/lib/utils'
import type { ChatSummary } from '@/types/api'

export type ChatFilter = 'all' | 'bot' | 'humano' | 'open' | 'closed' | 'optout'

export const chatFilters: Array<{ value: ChatFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'bot', label: 'Bot' },
  { value: 'humano', label: 'Humano' },
  { value: 'open', label: 'Ventana abierta' },
  { value: 'closed', label: 'Ventana cerrada' },
  { value: 'optout', label: 'Opt-out' },
]

export function contactName(chat: ChatSummary | null | undefined): string {
  if (!chat) return 'Conversación'
  return chat.name?.trim() || chat.phone || chat.user_id
}

export function contactHandle(chat: ChatSummary): string {
  if (chat.phone) return chat.phone
  if (chat.username) return `@${chat.username}`
  return chat.user_id
}

export function contactInitialSeed(chat: ChatSummary): string {
  return chat.phone || chat.username || chat.user_id
}

export function activityAt(chat: ChatSummary): number {
  return Math.max(chat.updated_at ?? 0, chat.last_seen_at ?? 0)
}

export function sortChats(chats: ChatSummary[]): ChatSummary[] {
  return [...chats].sort((a, b) => activityAt(b) - activityAt(a))
}

export function lastMessagePreview(chat: ChatSummary): string {
  const body = chat.last_body?.trim()
  const base =
    body ||
    (chat.last_kind === 'image'
      ? 'Foto'
      : chat.last_kind === 'audio'
        ? 'Nota de voz'
        : chat.last_kind === 'document'
          ? 'Documento'
          : chat.last_kind === 'video'
            ? 'Video'
            : 'Sin mensajes')
  return chat.last_dir === 'out' ? `Tú: ${base}` : base
}

export function plainSummary(summary: string): string {
  return summary
    .replace(/\*\*/g, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Texto de una o dos líneas para la tarjeta de la lista. */
export function summaryPreview(summary: string | null | undefined, maxLength = 220): string {
  if (typeof summary !== 'string' || !summary) return ''
  const plain = plainSummary(summary).replace(/\s+/g, ' ').trim()
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength).trimEnd()}…`
}

/** Los resúmenes largos se pueden contraer en el detalle. */
export function summaryNeedsToggle(summary: string, maxLength = 240): boolean {
  const text = summary.trim()
  return text.length > maxLength || text.split('\n').length > 6
}

export function filterChats(
  chats: ChatSummary[],
  filter: ChatFilter,
  search: string,
): ChatSummary[] {
  const term = normalizeSearch(search)
  return sortChats(chats).filter((chat) => {
    if (filter === 'bot' && chat.status !== 'bot') return false
    if (filter === 'humano' && chat.status !== 'humano') return false
    if (filter === 'open' && !chat.window_open) return false
    if (filter === 'closed' && chat.window_open) return false
    if (filter === 'optout' && !chat.opt_out) return false
    if (!term) return true
    return [chat.name, chat.phone, chat.username, chat.last_body, chat.user_id]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value).includes(term))
  })
}

export interface InboxSummary {
  total: number
  waiting: number
  closedWindows: number
  optedOut: number
}

export function summarizeChats(chats: ChatSummary[]): InboxSummary {
  return {
    total: chats.length,
    waiting: chats.filter((chat) => chat.last_dir === 'in').length,
    closedWindows: chats.filter((chat) => !chat.window_open).length,
    optedOut: chats.filter((chat) => chat.opt_out).length,
  }
}
