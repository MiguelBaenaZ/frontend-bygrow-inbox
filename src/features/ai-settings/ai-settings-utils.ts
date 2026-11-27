import { ApiError } from '@/lib/api'
import type {
  AiService,
  AiSettings,
  AiSettingsLimits,
  AiSettingsMessages,
  AiSettingsReplyDelay,
} from '@/types/api'

export type AiSettingsFieldErrors = Record<string, string>

export type AiSettingsMessageKey = keyof AiSettingsMessages

export const AI_SETTINGS_MESSAGE_KEYS: AiSettingsMessageKey[] = [
  'handoff',
  'technicalError',
  'audioFailed',
  'unsupported',
  'fallback',
]

export const MAX_TOKENS_MIN = 100
export const MAX_TOKENS_MAX = 4000
export const DEFAULT_TEMPERATURE = 0.7

export const REPLY_DELAY_MIN = 0
export const REPLY_DELAY_MAX = 25
export const DEFAULT_REPLY_DELAY: AiSettingsReplyDelay = { minSeconds: 4, maxSeconds: 9 }

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function createEmptyAiSettings(): AiSettings {
  return {
    assistantName: '',
    businessName: '',
    businessDescription: '',
    personality: '',
    businessHours: '',
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
    replyDelay: { ...DEFAULT_REPLY_DELAY },
    model: '',
    temperature: null,
    maxTokens: null,
  }
}

export function clampReplyDelaySeconds(value: number): number {
  return Math.min(REPLY_DELAY_MAX, Math.max(REPLY_DELAY_MIN, value))
}

/**
 * Corrige el tiempo de respuesta igual que el backend: limita ambos valores a
 * 0–25 y sube el máximo hasta el mínimo cuando vienen invertidos. Las versiones
 * antiguas que no traen el campo usan 4 y 9 segundos.
 */
export function normalizeReplyDelay(value: unknown): AiSettingsReplyDelay {
  const raw = value && typeof value === 'object' ? (value as Partial<AiSettingsReplyDelay>) : {}

  const min = optionalNumber(raw.minSeconds)
  const max = optionalNumber(raw.maxSeconds)
  const minSeconds = clampReplyDelaySeconds(min ?? DEFAULT_REPLY_DELAY.minSeconds)
  const maxSeconds = Math.max(
    minSeconds,
    clampReplyDelaySeconds(max ?? DEFAULT_REPLY_DELAY.maxSeconds),
  )

  return { minSeconds, maxSeconds }
}

/**
 * Deja el objeto listo para enviar al backend: recorta espacios, descarta
 * servicios sin nombre y reglas vacías, y convierte números vacíos a null.
 */
export function normalizeAiSettings(settings: AiSettings): AiSettings {
  const rawServices = Array.isArray(settings.services) ? settings.services : []
  const services: AiService[] = rawServices
    .map((service) => ({
      name: text(service?.name),
      description: text(service?.description),
      price: text(service?.price),
    }))
    .filter((service) => service.name.length > 0)

  const rawRules = Array.isArray(settings.rules) ? settings.rules : []
  const rules = rawRules.map((rule) => text(rule)).filter((rule) => rule.length > 0)

  return {
    assistantName: text(settings.assistantName),
    businessName: text(settings.businessName),
    businessDescription: text(settings.businessDescription),
    personality: text(settings.personality),
    businessHours: text(settings.businessHours),
    services,
    knowledge: text(settings.knowledge),
    rules,
    extraInstructions: text(settings.extraInstructions),
    messages: {
      handoff: text(settings.messages?.handoff),
      technicalError: text(settings.messages?.technicalError),
      audioFailed: text(settings.messages?.audioFailed),
      unsupported: text(settings.messages?.unsupported),
      fallback: text(settings.messages?.fallback),
    },
    replyDelay: normalizeReplyDelay(settings.replyDelay),
    model: text(settings.model),
    temperature: optionalNumber(settings.temperature),
    maxTokens: optionalNumber(settings.maxTokens),
  }
}

export function hasAiSettingsChanges(current: AiSettings, baseline: AiSettings): boolean {
  return (
    JSON.stringify(normalizeAiSettings(current)) !== JSON.stringify(normalizeAiSettings(baseline))
  )
}

/** Cuenta solo lo que se guardará: sin espacios al inicio ni al final. */
export function characterCount(value: string): number {
  return value.trim().length
}

export function validateAiSettings(
  settings: AiSettings,
  limits: AiSettingsLimits,
): AiSettingsFieldErrors {
  const errors: AiSettingsFieldErrors = {}

  function checkLength(key: string, value: string, max: number) {
    if (characterCount(value) > max) {
      errors[key] = `Máximo ${max} caracteres.`
    }
  }

  checkLength('assistantName', settings.assistantName, limits.short)
  checkLength('businessName', settings.businessName, limits.short)
  checkLength('businessDescription', settings.businessDescription, limits.medium)
  checkLength('personality', settings.personality, limits.long)
  checkLength('businessHours', settings.businessHours, limits.short)
  checkLength('knowledge', settings.knowledge, limits.long)
  checkLength('extraInstructions', settings.extraInstructions, limits.long)
  checkLength('model', settings.model, limits.short)

  settings.services.forEach((service, index) => {
    checkLength(`services.${index}.name`, service.name, limits.short)
    checkLength(`services.${index}.description`, service.description, limits.medium)
    checkLength(`services.${index}.price`, service.price, limits.short)
  })

  const namedServices = settings.services.filter((service) => characterCount(service.name) > 0)
  if (namedServices.length > limits.maxServices) {
    errors.services = `Puedes guardar hasta ${limits.maxServices} servicios.`
  }

  settings.rules.forEach((rule, index) => {
    if (characterCount(rule) > limits.ruleLength) {
      errors[`rules.${index}`] = `Máximo ${limits.ruleLength} caracteres.`
    }
  })

  const filledRules = settings.rules.filter((rule) => characterCount(rule) > 0)
  if (filledRules.length > limits.maxRules) {
    errors.rules = `Puedes guardar hasta ${limits.maxRules} reglas.`
  }

  AI_SETTINGS_MESSAGE_KEYS.forEach((key) => {
    checkLength(`messages.${key}`, settings.messages[key], limits.short)
  })

  const { temperature, maxTokens } = settings
  if (
    temperature !== null &&
    (typeof temperature !== 'number' ||
      !Number.isFinite(temperature) ||
      temperature < 0 ||
      temperature > 1)
  ) {
    errors.temperature = 'La temperatura debe estar entre 0 y 1.'
  }

  if (
    maxTokens !== null &&
    (typeof maxTokens !== 'number' ||
      !Number.isFinite(maxTokens) ||
      !Number.isInteger(maxTokens) ||
      maxTokens < MAX_TOKENS_MIN ||
      maxTokens > MAX_TOKENS_MAX)
  ) {
    errors.maxTokens = `Usa un número entero entre ${MAX_TOKENS_MIN} y ${MAX_TOKENS_MAX}.`
  }

  const replyDelay = settings.replyDelay
  if (replyDelay) {
    const { minSeconds, maxSeconds } = replyDelay
    if (
      !Number.isFinite(minSeconds) ||
      !Number.isFinite(maxSeconds) ||
      minSeconds < REPLY_DELAY_MIN ||
      maxSeconds > REPLY_DELAY_MAX ||
      maxSeconds < minSeconds
    ) {
      errors.replyDelay = `Usa valores entre ${REPLY_DELAY_MIN} y ${REPLY_DELAY_MAX} segundos, con el máximo igual o mayor que el mínimo.`
    }
  }

  return errors
}

export interface AiSettingsErrorInfo {
  message: string
  details: string[]
  retryable: boolean
  forbidden: boolean
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

export function describeAiSettingsError(error: unknown, fallback: string): AiSettingsErrorInfo {
  if (!(error instanceof ApiError)) {
    return { message: fallback, details: [], retryable: false, forbidden: false }
  }

  const details = error.details ?? []

  if (error.status === 401) {
    return {
      message: 'Tu sesión expiró. Vuelve a iniciar sesión.',
      details,
      retryable: false,
      forbidden: false,
    }
  }

  if (error.status === 403) {
    return {
      message: 'No tienes permiso para esta acción.',
      details,
      retryable: false,
      forbidden: true,
    }
  }

  if (error.status === 0 || error.status >= 500) {
    return { message: fallback, details, retryable: true, forbidden: false }
  }

  if (error.status === 400) {
    const message = error.message ?? error.code
    return {
      message:
        message && message !== 'request_failed'
          ? message
          : 'Revisa la configuración: hay datos que no cumplen las reglas.',
      details,
      retryable: false,
      forbidden: false,
    }
  }

  return {
    message: error.message || fallback,
    details,
    retryable: false,
    forbidden: false,
  }
}
