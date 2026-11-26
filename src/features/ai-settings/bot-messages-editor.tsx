import { RotateCcwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AI_SETTINGS_MESSAGE_KEYS,
  type AiSettingsFieldErrors,
  type AiSettingsMessageKey,
} from '@/features/ai-settings/ai-settings-utils'
import { Field } from '@/features/ai-settings/form-parts'
import type { AiSettingsLimits, AiSettingsMessages } from '@/types/api'

const MESSAGE_LABELS: Record<AiSettingsMessageKey, string> = {
  handoff: 'Pasar con un asesor',
  technicalError: 'Error técnico',
  audioFailed: 'Nota de voz no entendida',
  unsupported: 'Tipo de mensaje no soportado',
  fallback: 'Respuesta de respaldo',
}

interface BotMessagesEditorProps {
  messages: AiSettingsMessages
  defaults: AiSettingsMessages
  limits: AiSettingsLimits
  errors: AiSettingsFieldErrors
  onChange: (messages: AiSettingsMessages) => void
}

export function BotMessagesEditor({
  messages,
  defaults,
  limits,
  errors,
  onChange,
}: BotMessagesEditorProps) {
  function updateMessage(key: AiSettingsMessageKey, value: string) {
    onChange({ ...messages, [key]: value })
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px] leading-5 text-muted-foreground">
        Cada mensaje vacío usa el texto por defecto del sistema. El texto por defecto aparece como
        referencia dentro de cada campo.
      </p>

      {AI_SETTINGS_MESSAGE_KEYS.map((key) => {
        const value = messages[key]
        const fieldId = `message-${key}`

        return (
          <div key={key} className="space-y-1.5">
            <Field
              id={fieldId}
              label={MESSAGE_LABELS[key]}
              value={value}
              max={limits.short}
              error={errors[`messages.${key}`]}
              hint="Vacío = se usa el texto por defecto del sistema."
            >
              {(aria) => (
                <Input
                  id={fieldId}
                  value={value}
                  onChange={(event) => updateMessage(key, event.target.value)}
                  placeholder={defaults[key]}
                  autoComplete="off"
                  {...aria}
                />
              )}
            </Field>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={value.length === 0}
                onClick={() => updateMessage(key, '')}
              >
                <RotateCcwIcon className="size-3" aria-hidden="true" />
                Restaurar texto por defecto
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
