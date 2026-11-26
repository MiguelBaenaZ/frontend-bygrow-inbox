import type { ConversationStatus, LeadStage, Role, TemplateInfo } from '@/types/api'

export const BOGOTA_TIME_ZONE = 'America/Bogota'

const dateTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateOnly = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TIME_ZONE,
  dateStyle: 'medium',
})

const timeOnly = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const shortDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TIME_ZONE,
  day: 'numeric',
  month: 'short',
})

const dayDivider = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const number = new Intl.NumberFormat('es-CO')

export function bogotaDayKey(timestamp: number): string {
  const parts = dayKeyFormatter.formatToParts(new Date(timestamp))
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  return `${year}-${month}-${day}`
}

function dayKey(timestamp: number): string {
  return bogotaDayKey(timestamp)
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-CO') + value.slice(1)
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Sin fecha'
  return dateTime.format(new Date(timestamp))
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Sin fecha'
  return dateOnly.format(new Date(timestamp))
}

export function formatTime(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return timeOnly.format(new Date(timestamp))
}

export function isToday(timestamp: number, now = Date.now()): boolean {
  return dayKey(timestamp) === dayKey(now)
}

export function isYesterday(timestamp: number, now = Date.now()): boolean {
  return dayKey(timestamp) === dayKey(now - 86_400_000)
}

export function formatInboxStamp(timestamp: number, now = Date.now()): string {
  if (isToday(timestamp, now)) return formatTime(timestamp)
  if (isYesterday(timestamp, now)) return 'Ayer'
  return shortDate.format(new Date(timestamp))
}

export function formatDayDivider(timestamp: number, now = Date.now()): string {
  if (isToday(timestamp, now)) return 'Hoy'
  if (isYesterday(timestamp, now)) return 'Ayer'
  return capitalize(dayDivider.format(new Date(timestamp)))
}

export function formatRelative(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return 'hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function formatWindowRemaining(
  expiresAt: number | null | undefined,
  now = Date.now(),
): string {
  if (!expiresAt) return 'Sin ventana'
  const remaining = expiresAt - now
  if (remaining <= 0) return 'Cerrada'
  const totalMinutes = Math.ceil(remaining / 60_000)
  if (totalMinutes < 60) {
    if (totalMinutes <= 1) return 'Queda menos de 1 min'
    return `Quedan ${totalMinutes} min`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `Quedan ${hours} h`
  return `Quedan ${hours} h ${minutes} min`
}

export function windowProgress(
  lastInboundAt: number | null | undefined,
  expiresAt: number | null | undefined,
  now = Date.now(),
): number {
  if (!expiresAt || !lastInboundAt) return 0
  const remaining = expiresAt - now
  if (remaining <= 0) return 0
  return Math.min(100, Math.max(0, (remaining / 86_400_000) * 100))
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return 'Sin teléfono'
  const compact = value.trim()
  if (!/^\d+$/.test(compact)) return compact
  if (compact.length === 12 && compact.startsWith('57')) {
    const local = compact.slice(2)
    return `+57 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  }
  if (compact.length === 10) {
    return `${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6)}`
  }
  return `+${compact}`
}

export function formatRole(role: Role): string {
  return role === 'admin' ? 'Administrador' : 'Asesor'
}

export function formatLeadStage(stage: LeadStage | null | undefined): string {
  switch (stage) {
    case 'en_diagnostico':
      return 'En diagnóstico'
    case 'propuesto':
      return 'Propuesto'
    case 'cliente':
      return 'Cliente'
    case 'perdido':
      return 'Perdido'
    case 'nuevo':
    default:
      return 'Nuevo'
  }
}

export function formatConversationStatus(status: ConversationStatus | null | undefined): string {
  return status === 'humano' ? 'Humano' : 'Bot'
}

export function formatMessageStatus(status: string | null | undefined): string {
  switch (status) {
    case 'sent':
      return 'Enviado'
    case 'delivered':
      return 'Entregado'
    case 'read':
      return 'Leído'
    case 'failed':
      return 'No enviado'
    case 'received':
      return 'Recibido'
    default:
      return status ? capitalize(status) : ''
  }
}

export function formatMessageKind(kind: string): string {
  switch (kind) {
    case 'image':
      return 'Imagen'
    case 'audio':
      return 'Nota de voz'
    case 'document':
      return 'Documento'
    case 'video':
      return 'Video'
    case 'sticker':
      return 'Sticker'
    case 'location':
      return 'Ubicación'
    case 'template':
      return 'Plantilla'
    default:
      return capitalize(kind)
  }
}

export function formatTemplateCategory(category: string): string {
  switch (category.toLocaleUpperCase('es-CO')) {
    case 'MARKETING':
      return 'Marketing'
    case 'UTILITY':
      return 'Utilidad'
    case 'AUTHENTICATION':
      return 'Autenticación'
    default:
      return capitalize(category.toLocaleLowerCase('es-CO'))
  }
}

export function formatTemplateLanguage(language: string): string {
  const normalized = language.replace('-', '_').toLocaleLowerCase('es-CO')
  const names: Record<string, string> = {
    es: 'Español',
    es_co: 'Español (Colombia)',
    es_mx: 'Español (México)',
    en: 'Inglés',
    en_us: 'Inglés (EE. UU.)',
    pt_br: 'Portugués (Brasil)',
  }
  return names[normalized] ?? language
}

export function formatTemplateSummary(template: TemplateInfo): string {
  const params =
    template.params > 0
      ? `${template.params} ${template.params === 1 ? 'variable' : 'variables'}`
      : 'Sin variables'
  return `${formatTemplateLanguage(template.language)} · ${params}`
}

export function formatOptInSource(source: string | null): string {
  if (!source) return 'Sin origen registrado'
  if (source.startsWith('panel:')) return `Panel · ${source.slice(6)}`
  if (source === 'inbound_keyword') return 'Mensaje del contacto'
  return source
}

export function formatNumber(value: number): string {
  return number.format(value)
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
