import { describe, expect, it } from 'vitest'

import { getInitials, isEmail, normalizeSearch } from '@/lib/utils'

describe('utils', () => {
  it('valida correos de forma básica para la UX', () => {
    expect(isEmail('equipo@bygrow.co')).toBe(true)
    expect(isEmail('equipo@bygrow')).toBe(false)
    expect(isEmail('sin-arroba.co')).toBe(false)
  })

  it('genera iniciales estables', () => {
    expect(getInitials('Miguel Baena')).toBe('MB')
    expect(getInitials('yane')).toBe('YA')
    expect(getInitials(null)).toBe('?')
  })

  it('normaliza búsquedas con tildes y mayúsculas', () => {
    expect(normalizeSearch('  Diagnóstico  ')).toBe('diagnostico')
    expect(normalizeSearch('BOGOTÁ')).toBe('bogota')
  })
})
