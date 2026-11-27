import type {
  AiSettings,
  AiSettingsHistoryResponse,
  AiSettingsMutationResponse,
  AiSettingsPreviewResponse,
  AiSettingsResponse,
  ChatDetailResponse,
  ChatProfilePatch,
  ChatProfileResponse,
  ChatsResponse,
  ChatSummaryRebuildResponse,
  HandoffResponse,
  LeadStage,
  LoginResponse,
  MaintenanceResponse,
  MeResponse,
  OptInResponse,
  ReplyResponse,
  StageResponse,
  TemplateSendResponse,
  TemplatesResponse,
  UsersResponse,
  ConversationStatus,
} from '@/types/api'
import { isRecord } from '@/lib/utils'

/**
 * Vacío = mismo origen (/api y /media van por el proxy del hosting o de Vite).
 * VITE_API_URL es pública por definición: nunca debe contener secretos.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const UNAUTHORIZED_EVENT = 'bygrow:unauthorized'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: string[]

  constructor(status: number, code: string, message?: string, details?: string[]) {
    super(message ?? code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function apiErrorFromBody(status: number, text: string): ApiError {
  const body = parseJson(text)
  if (!isRecord(body)) {
    return new ApiError(status, 'request_failed')
  }

  const code = typeof body.error === 'string' ? body.error : 'request_failed'
  const message = typeof body.message === 'string' ? body.message : undefined
  const details = Array.isArray(body.details)
    ? body.details.filter((detail): detail is string => typeof detail === 'string')
    : undefined

  return new ApiError(status, code, message, details)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    )
  }

  const text = await response.text()
  const data = parseJson(text)

  if (!response.ok) {
    const error = apiErrorFromBody(response.status, text)
    if (shouldNotifyUnauthorized(path, error)) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    throw error
  }

  return data as T
}

function shouldNotifyUnauthorized(path: string, error: ApiError): boolean {
  if (error.status !== 401) return false
  if (path === '/api/auth/login' || path === '/api/auth/me') return false
  if (path === '/api/auth/logout') return false
  // Este endpoint usa 401 también para “contraseña actual incorrecta”.
  if (path === '/api/auth/change-password') return error.code === 'no autenticado'
  return true
}

function jsonBody(body: unknown, method = 'POST'): RequestInit {
  return {
    method,
    body: JSON.stringify(body),
  }
}

export const authApi = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login', jsonBody({ email, password }))
  },

  logout(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
  },

  me(): Promise<MeResponse> {
    return request<MeResponse>('/api/auth/me')
  },

  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      '/api/auth/change-password',
      jsonBody({ currentPassword, newPassword }),
    )
  },
}

export const chatsApi = {
  list(): Promise<ChatsResponse> {
    return request<ChatsResponse>('/api/chats')
  },

  get(chatId: string): Promise<ChatDetailResponse> {
    return request<ChatDetailResponse>(`/api/chats/${encodeURIComponent(chatId)}`)
  },

  updateProfile(chatId: string, patch: ChatProfilePatch): Promise<ChatProfileResponse> {
    return request<ChatProfileResponse>(
      `/api/chats/${encodeURIComponent(chatId)}/profile`,
      jsonBody(patch, 'PATCH'),
    )
  },

  rebuildSummary(chatId: string): Promise<ChatSummaryRebuildResponse> {
    return request<ChatSummaryRebuildResponse>(
      `/api/chats/${encodeURIComponent(chatId)}/summary/rebuild`,
      { method: 'POST' },
    )
  },

  remove(chatId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/chats/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
    })
  },
}

export const messagesApi = {
  remove(messageId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    })
  },
}

export const inboxApi = {
  reply(to: string, body: string): Promise<ReplyResponse> {
    return request<ReplyResponse>('/api/reply', jsonBody({ to, body }))
  },

  handoff(to: string, action: 'pause' | 'resume'): Promise<HandoffResponse> {
    return request<HandoffResponse>('/api/handoff', jsonBody({ to, action }))
  },

  setStage(to: string, stage: LeadStage): Promise<StageResponse> {
    return request<StageResponse>('/api/stage', jsonBody({ to, stage }))
  },

  setOptIn(to: string, values: { optIn?: boolean; optOut?: boolean }): Promise<OptInResponse> {
    return request<OptInResponse>('/api/optin', jsonBody({ to, ...values }))
  },

  listTemplates(): Promise<TemplatesResponse> {
    return request<TemplatesResponse>('/api/templates')
  },

  sendTemplate(
    to: string,
    template: { name: string; language: string; params?: string[] },
  ): Promise<TemplateSendResponse> {
    return request<TemplateSendResponse>('/api/template', jsonBody({ to, ...template }))
  },

  runFollowup(): Promise<MaintenanceResponse> {
    return request<MaintenanceResponse>('/api/followup/run', { method: 'POST' })
  },

  runRetention(): Promise<MaintenanceResponse> {
    return request<MaintenanceResponse>('/api/privacy/retention/run', { method: 'POST' })
  },

  cleanupMedia(): Promise<MaintenanceResponse> {
    return request<MaintenanceResponse>('/api/media/cleanup', { method: 'POST' })
  },
}

export const usersApi = {
  list(): Promise<UsersResponse> {
    return request<UsersResponse>('/api/users')
  },

  create(input: {
    email: string
    name?: string
    password: string
    role: 'admin' | 'asesor'
  }): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/users', jsonBody(input))
  },

  update(
    id: string,
    input: { name?: string; role?: 'admin' | 'asesor'; active?: boolean },
  ): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    })
  },

  resetPassword(id: string, password: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(id)}/reset-password`,
      jsonBody({ password }),
    )
  },
}

export const aiSettingsApi = {
  get(): Promise<AiSettingsResponse> {
    return request<AiSettingsResponse>('/api/ai-settings')
  },

  update(settings: AiSettings): Promise<AiSettingsMutationResponse> {
    return request<AiSettingsMutationResponse>('/api/ai-settings', jsonBody(settings, 'PUT'))
  },

  preview(settings: AiSettings): Promise<AiSettingsPreviewResponse> {
    return request<AiSettingsPreviewResponse>('/api/ai-settings/preview', jsonBody(settings))
  },

  history(): Promise<AiSettingsHistoryResponse> {
    return request<AiSettingsHistoryResponse>('/api/ai-settings/history')
  },

  restore(version: number): Promise<AiSettingsMutationResponse> {
    return request<AiSettingsMutationResponse>(
      `/api/ai-settings/restore/${encodeURIComponent(String(version))}`,
      { method: 'POST' },
    )
  },

  reset(): Promise<AiSettingsMutationResponse> {
    return request<AiSettingsMutationResponse>('/api/ai-settings/reset', { method: 'POST' })
  },
}

export function mediaUrl(key: string): string {
  const safeKey = key
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${API_BASE}/media/${safeKey}`
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function conversationStatusFrom(
  status: ConversationStatus | null | undefined,
): ConversationStatus {
  return status === 'humano' ? 'humano' : 'bot'
}
