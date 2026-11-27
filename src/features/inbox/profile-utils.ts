import type { ChatProfile, ChatProfilePatch } from '@/types/api'

export const PROFILE_TEXT_MAX = 200
export const PROFILE_PAINS_MAX = 10
export const PROFILE_INTERESTS_MAX = 10
export const PROFILE_NOTES_MAX = 15

export const profileTextFields = [
  { key: 'name', label: 'Nombre', placeholder: 'Nombre del cliente' },
  { key: 'company', label: 'Empresa', placeholder: 'Nombre de la empresa' },
  { key: 'business', label: 'A qué se dedica', placeholder: 'Actividad o negocio' },
  { key: 'customers', label: 'A quién le vende', placeholder: 'Perfil de sus clientes' },
  { key: 'channels', label: 'Cómo consigue clientes', placeholder: 'Canales y estrategias' },
  { key: 'city', label: 'Ciudad', placeholder: 'Ciudad o región' },
  { key: 'email', label: 'Correo', placeholder: 'correo@ejemplo.com' },
] as const

export type ProfileTextField = (typeof profileTextFields)[number]['key']

export type ProfileListKey = 'pains' | 'interests' | 'notes'

export const profileListFields: Array<{
  key: ProfileListKey
  label: string
  singular: string
  plural: string
  max: number
  placeholder: string
  multiline: boolean
}> = [
  {
    key: 'pains',
    label: 'Problemas',
    singular: 'problema',
    plural: 'problemas',
    max: PROFILE_PAINS_MAX,
    placeholder: 'Ej. no tiene presencia digital',
    multiline: false,
  },
  {
    key: 'interests',
    label: 'Servicios de interés',
    singular: 'servicio',
    plural: 'servicios',
    max: PROFILE_INTERESTS_MAX,
    placeholder: 'Ej. automatización de WhatsApp',
    multiline: false,
  },
  {
    key: 'notes',
    label: 'Notas',
    singular: 'nota',
    plural: 'notas',
    max: PROFILE_NOTES_MAX,
    placeholder: 'Contexto útil para la conversación',
    multiline: true,
  },
]

export function createEmptyProfile(): ChatProfile {
  return {
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
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(text).filter((item) => item.length > 0)
}

/** Deja la ficha como se enviará al servidor. */
export function normalizeProfile(profile: ChatProfile): ChatProfile {
  return {
    name: text(profile.name),
    company: text(profile.company),
    business: text(profile.business),
    customers: text(profile.customers),
    channels: text(profile.channels),
    city: text(profile.city),
    email: text(profile.email),
    pains: list(profile.pains),
    interests: list(profile.interests),
    notes: list(profile.notes),
  }
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/**
 * Devuelve solo los campos que cambiaron. Un texto vacío o una lista vacía
 * viajan explícitamente para borrar el dato en el servidor.
 */
export function buildProfilePatch(original: ChatProfile, draft: ChatProfile): ChatProfilePatch {
  const before = normalizeProfile(original)
  const after = normalizeProfile(draft)
  const patch: ChatProfilePatch = {}

  for (const field of profileTextFields) {
    if (after[field.key] !== before[field.key]) {
      patch[field.key] = after[field.key]
    }
  }

  for (const field of profileListFields) {
    if (!sameList(after[field.key], before[field.key])) {
      patch[field.key] = after[field.key]
    }
  }

  return patch
}

export interface ProfileValidationResult {
  fieldErrors: Record<string, string>
  valid: boolean
}

export function validateProfileDraft(draft: ChatProfile): ProfileValidationResult {
  const fieldErrors: Record<string, string> = {}
  const normalized = normalizeProfile(draft)

  for (const field of profileTextFields) {
    if (normalized[field.key].length > PROFILE_TEXT_MAX) {
      fieldErrors[field.key] = `Máximo ${PROFILE_TEXT_MAX} caracteres.`
    }
  }

  for (const field of profileListFields) {
    const items = draft[field.key]

    items.forEach((item, index) => {
      if (text(item).length > PROFILE_TEXT_MAX) {
        fieldErrors[`${field.key}.${index}`] = `Máximo ${PROFILE_TEXT_MAX} caracteres.`
      }
    })

    const filled = items.filter((item) => text(item).length > 0).length
    if (filled > field.max) {
      fieldErrors[field.key] = `Puedes guardar hasta ${field.max} ${field.plural}.`
    }
  }

  return {
    fieldErrors,
    valid: Object.keys(fieldErrors).length === 0,
  }
}

export function profileHasData(profile: ChatProfile): boolean {
  const normalized = normalizeProfile(profile)
  return (
    profileTextFields.some((field) => normalized[field.key].length > 0) ||
    profileListFields.some((field) => normalized[field.key].length > 0)
  )
}
