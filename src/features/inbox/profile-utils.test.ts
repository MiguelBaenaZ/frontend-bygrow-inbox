import { describe, expect, it } from 'vitest'

import {
  buildProfilePatch,
  PROFILE_PAINS_MAX,
  PROFILE_TEXT_MAX,
  validateProfileDraft,
} from '@/features/inbox/profile-utils'
import type { ChatProfile } from '@/types/api'

function profile(overrides: Partial<ChatProfile> = {}): ChatProfile {
  return {
    name: 'Yane',
    company: 'ByGrow',
    business: 'Agencia',
    customers: 'Pymes',
    channels: 'Instagram',
    city: 'Bogotá',
    email: 'yane@bygrow.com',
    pains: ['Sin presencia digital'],
    interests: ['WhatsApp'],
    notes: ['Llamar por la tarde'],
    ...overrides,
  }
}

describe('profile-utils', () => {
  it('construye el PATCH solo con los campos modificados', () => {
    const base = profile()
    expect(buildProfilePatch(base, { ...base, company: 'Nueva empresa' })).toEqual({
      company: 'Nueva empresa',
    })

    expect(
      buildProfilePatch(base, {
        ...base,
        city: 'Medellín',
        pains: ['Sin presencia digital', 'No mide resultados'],
      }),
    ).toEqual({
      city: 'Medellín',
      pains: ['Sin presencia digital', 'No mide resultados'],
    })
  })

  it('envía un texto vacío o una lista vacía para borrar el dato', () => {
    const base = profile()
    expect(buildProfilePatch(base, { ...base, email: '' })).toEqual({ email: '' })
    expect(buildProfilePatch(base, { ...base, notes: [] })).toEqual({ notes: [] })
  })

  it('ignora diferencias que solo son espacios', () => {
    const base = profile()
    expect(
      buildProfilePatch(base, {
        ...base,
        name: '  Yane  ',
        pains: ['  Sin presencia digital  '],
      }),
    ).toEqual({})
  })

  it('valida los límites de caracteres y de ítems', () => {
    const result = validateProfileDraft(
      profile({
        company: 'a'.repeat(PROFILE_TEXT_MAX + 1),
        pains: Array.from({ length: PROFILE_PAINS_MAX + 1 }, () => 'problema'),
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.fieldErrors.company).toBe('Máximo 200 caracteres.')
    expect(result.fieldErrors.pains).toBe('Puedes guardar hasta 10 problemas.')
  })
})
