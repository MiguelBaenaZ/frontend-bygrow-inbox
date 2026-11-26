import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/features/ai-settings/form-parts'
import type { AiSettingsFieldErrors } from '@/features/ai-settings/ai-settings-utils'
import type { AiSettingsLimits } from '@/types/api'

interface RulesEditorProps {
  rules: string[]
  limits: AiSettingsLimits
  errors: AiSettingsFieldErrors
  onChange: (rules: string[]) => void
}

export function RulesEditor({ rules, limits, errors, onChange }: RulesEditorProps) {
  const atLimit = rules.length >= limits.maxRules

  function updateRule(index: number, value: string) {
    onChange(rules.map((rule, currentIndex) => (currentIndex === index ? value : rule)))
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-[440px] text-[12px] leading-5 text-muted-foreground">
          Frases cortas que el asistente debe respetar siempre.
        </p>
        <span className="num text-[11px] text-muted-foreground">
          {rules.length} / {limits.maxRules} reglas
        </span>
      </div>

      {errors.rules ? <p className="text-[12px] text-destructive">{errors.rules}</p> : null}

      {rules.length > 0 ? (
        <ol className="space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Field
                  id={`rule-${index}`}
                  label={`Regla ${index + 1}`}
                  value={rule}
                  max={limits.ruleLength}
                  error={errors[`rules.${index}`]}
                >
                  {(aria) => (
                    <Input
                      id={`rule-${index}`}
                      value={rule}
                      onChange={(event) => updateRule(index, event.target.value)}
                      placeholder="Ejemplo: Nunca ofrezcas descuentos"
                      autoComplete="off"
                      {...aria}
                    />
                  )}
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6 shrink-0 text-muted-foreground hover:bg-danger-soft hover:text-danger-ink"
                aria-label={`Eliminar regla ${index + 1}`}
                onClick={() => removeRule(index)}
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center">
          <p className="text-[13px] text-muted-foreground">
            Aún no hay reglas. Agrega la primera, por ejemplo: «Nunca ofrezcas descuentos».
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={atLimit}
          onClick={() => onChange([...rules, ''])}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Agregar regla
        </Button>
        {atLimit ? (
          <p className="text-[11px] text-muted-foreground">
            Llegaste al máximo de {limits.maxRules} reglas.
          </p>
        ) : null}
      </div>
    </div>
  )
}
