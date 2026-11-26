import { describe, expect, it } from 'vitest'

import {
  formatLeadStage,
  formatPhone,
  formatTemplateLanguage,
  formatWindowRemaining,
} from '@/lib/format'

describe('format', () => {
  it('formatea teléfonos colombianos y deja los BSUID intactos', () => {
    expect(formatPhone('573022386856')).toBe('+57 302 238 6856')
    expect(formatPhone('3022386856')).toBe('302 238 6856')
    expect(formatPhone('CO.1111373588429824')).toBe('CO.1111373588429824')
  })

  it('presenta la cuenta regresiva de la ventana', () => {
    const now = 1_700_000_000_000
    expect(formatWindowRemaining(now + 4 * 3_600_000 + 12 * 60_000, now)).toBe(
      'Quedan 4 h 12 min',
    )
    expect(formatWindowRemaining(now - 1, now)).toBe('Cerrada')
    expect(formatWindowRemaining(now + 45 * 60_000, now)).toBe('Quedan 45 min')
  })

  it('traduce las etapas y los idiomas de plantillas', () => {
    expect(formatLeadStage('en_diagnostico')).toBe('En diagnóstico')
    expect(formatLeadStage('perdido')).toBe('Perdido')
    expect(formatTemplateLanguage('es_CO')).toBe('Español (Colombia)')
    expect(formatTemplateLanguage('en')).toBe('Inglés')
  })
})
