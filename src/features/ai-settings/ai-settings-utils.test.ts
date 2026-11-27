import { describe, expect, it } from 'vitest'

import {
  createEmptyAiSettings,
  hasAiSettingsChanges,
  normalizeAiSettings,
  normalizeReplyDelay,
  validateAiSettings,
} from '@/features/ai-settings/ai-settings-utils'
import type { AiSettings, AiSettingsLimits } from '@/types/api'

const limits: AiSettingsLimits = {
  short: 200,
  medium: 1000,
  long: 6000,
  maxServices: 50,
  maxRules: 30,
  ruleLength: 300,
}

function settingsWith(overrides: Partial<AiSettings> = {}): AiSettings {
  return {
    ...createEmptyAiSettings(),
    assistantName: '  Ana de ByGrow  ',
    businessName: '  ByGrow ',
    businessDescription: '  Agencia de crecimiento  ',
    personality: '  Cercano y claro  ',
    businessHours: '  Lunes a viernes  ',
    services: [
      { name: '  Consultoría  ', description: '  Diagnóstico  ', price: '  $100  ' },
      { name: '   ', description: 'Sin nombre', price: '$0' },
    ],
    knowledge: '  Preguntas frecuentes  ',
    rules: ['  Nunca ofrezcas descuentos  ', '   ', ''],
    extraInstructions: '  Cierra con una pregunta  ',
    messages: {
      handoff: '  Te paso con un asesor  ',
      technicalError: '  Error técnico  ',
      audioFailed: '  No entendí la nota de voz  ',
      unsupported: '  Tipo no soportado  ',
      fallback: '  Déjame verificarlo  ',
    },
    model: '  modelo-demo  ',
    temperature: 0,
    maxTokens: 1200,
    ...overrides,
  }
}

describe('normalizeAiSettings', () => {
  it('recorta espacios, elimina servicios sin nombre y reglas vacías', () => {
    const normalized = normalizeAiSettings(settingsWith())

    expect(normalized.assistantName).toBe('Ana de ByGrow')
    expect(normalized.businessName).toBe('ByGrow')
    expect(normalized.businessDescription).toBe('Agencia de crecimiento')
    expect(normalized.personality).toBe('Cercano y claro')
    expect(normalized.businessHours).toBe('Lunes a viernes')
    expect(normalized.services).toEqual([
      { name: 'Consultoría', description: 'Diagnóstico', price: '$100' },
    ])
    expect(normalized.rules).toEqual(['Nunca ofrezcas descuentos'])
    expect(normalized.knowledge).toBe('Preguntas frecuentes')
    expect(normalized.extraInstructions).toBe('Cierra con una pregunta')
    expect(normalized.messages).toEqual({
      handoff: 'Te paso con un asesor',
      technicalError: 'Error técnico',
      audioFailed: 'No entendí la nota de voz',
      unsupported: 'Tipo no soportado',
      fallback: 'Déjame verificarlo',
    })
    expect(normalized.model).toBe('modelo-demo')
  })

  it('convierte temperatura y maxTokens vacíos a null sin tocar el cero', () => {
    const normalized = normalizeAiSettings(
      settingsWith({
        temperature: '' as unknown as number,
        maxTokens: '' as unknown as number,
      }),
    )
    expect(normalized.temperature).toBeNull()
    expect(normalized.maxTokens).toBeNull()

    const withZero = normalizeAiSettings(settingsWith({ temperature: 0 }))
    expect(withZero.temperature).toBe(0)
  })

  it('convierte valores no numéricos a null', () => {
    const normalized = normalizeAiSettings(
      settingsWith({
        temperature: Number.NaN,
        maxTokens: Number.POSITIVE_INFINITY,
      }),
    )
    expect(normalized.temperature).toBeNull()
    expect(normalized.maxTokens).toBeNull()
  })

  it('usa 4 y 9 segundos cuando la configuración antigua no trae el tiempo de respuesta', () => {
    const legacy = settingsWith()
    delete (legacy as Partial<AiSettings>).replyDelay

    expect(normalizeAiSettings(legacy).replyDelay).toEqual({ minSeconds: 4, maxSeconds: 9 })
  })
})

describe('normalizeReplyDelay', () => {
  it('mantiene valores válidos y decimales', () => {
    expect(normalizeReplyDelay({ minSeconds: 3.5, maxSeconds: 7.25 })).toEqual({
      minSeconds: 3.5,
      maxSeconds: 7.25,
    })
  })

  it('sube el máximo hasta el mínimo cuando vienen invertidos', () => {
    expect(normalizeReplyDelay({ minSeconds: 10, maxSeconds: 3 })).toEqual({
      minSeconds: 10,
      maxSeconds: 10,
    })
  })

  it('limita los valores al rango de 0 a 25 segundos', () => {
    expect(normalizeReplyDelay({ minSeconds: 30, maxSeconds: 3 })).toEqual({
      minSeconds: 25,
      maxSeconds: 25,
    })
    expect(normalizeReplyDelay({ minSeconds: -5, maxSeconds: 30 })).toEqual({
      minSeconds: 0,
      maxSeconds: 25,
    })
  })

  it('permite la respuesta inmediata con 0 y 0', () => {
    expect(normalizeReplyDelay({ minSeconds: 0, maxSeconds: 0 })).toEqual({
      minSeconds: 0,
      maxSeconds: 0,
    })
  })
})

describe('hasAiSettingsChanges', () => {
  it('ignora diferencias que solo son espacios o valores normalizados', () => {
    const baseline = normalizeAiSettings(settingsWith())
    const current = settingsWith({
      assistantName: ' Ana de ByGrow ',
      services: [{ name: 'Consultoría', description: 'Diagnóstico', price: '$100' }],
      rules: ['Nunca ofrezcas descuentos', ''],
    })

    expect(hasAiSettingsChanges(current, baseline)).toBe(false)
  })

  it('detecta cambios reales y reordenamientos', () => {
    const baseline = normalizeAiSettings(settingsWith())
    expect(hasAiSettingsChanges({ ...baseline, assistantName: 'Otra' }, baseline)).toBe(true)

    const reordered = {
      ...baseline,
      services: [
        { name: 'B', description: '', price: '' },
        { name: 'A', description: '', price: '' },
      ],
    }
    const reorderedBaseline = {
      ...baseline,
      services: [
        { name: 'A', description: '', price: '' },
        { name: 'B', description: '', price: '' },
      ],
    }
    expect(hasAiSettingsChanges(reordered, reorderedBaseline)).toBe(true)
  })
})

describe('validateAiSettings', () => {
  it('marca los límites del servidor y los rangos numéricos', () => {
    const errors = validateAiSettings(
      settingsWith({
        assistantName: 'a'.repeat(limits.short + 1),
        rules: ['r'.repeat(limits.ruleLength + 1)],
        temperature: 1.5,
        maxTokens: 99,
      }),
      limits,
    )

    expect(errors.assistantName).toBe(`Máximo ${limits.short} caracteres.`)
    expect(errors['rules.0']).toBe(`Máximo ${limits.ruleLength} caracteres.`)
    expect(errors.temperature).toBeDefined()
    expect(errors.maxTokens).toBeDefined()
  })

  it('no marca errores con un formulario válido', () => {
    expect(validateAiSettings(normalizeAiSettings(settingsWith()), limits)).toEqual({})
  })
})
