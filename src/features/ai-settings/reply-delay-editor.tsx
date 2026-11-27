import { RotateCcwIcon, ZapIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_REPLY_DELAY,
  REPLY_DELAY_MAX,
  REPLY_DELAY_MIN,
  clampReplyDelaySeconds,
} from '@/features/ai-settings/ai-settings-utils'
import type { AiSettingsReplyDelay } from '@/types/api'

const secondsFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

function formatSeconds(value: number): string {
  return secondsFormatter.format(value)
}

interface SecondsInputProps {
  id: string
  label: string
  value: number
  describedBy: string
  invalid: boolean
  normalizeValue: (value: number) => number
  onChange: (value: number) => void
}

function SecondsInput({
  id,
  label,
  value,
  describedBy,
  invalid,
  normalizeValue,
  onChange,
}: SecondsInputProps) {
  const [text, setText] = useState(() => String(value))
  const [lastValue, setLastValue] = useState(value)
  const [focused, setFocused] = useState(false)

  // Mantiene el texto al día cuando el valor cambia desde fuera (atajos,
  // restauración o ajuste del otro campo) sin pisar lo que se está escribiendo.
  if (!focused && value !== lastValue) {
    setLastValue(value)
    setText(String(value))
  }

  function commit(raw: string) {
    if (raw.trim() === '') return

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return

    const normalized = normalizeValue(clampReplyDelaySeconds(parsed))
    onChange(normalized)
    if (normalized !== parsed) setText(String(normalized))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={REPLY_DELAY_MIN}
          max={REPLY_DELAY_MAX}
          step={0.5}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            commit(event.target.value)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            const parsed = Number(text)
            if (text.trim() === '' || !Number.isFinite(parsed)) {
              setText(String(value))
              return
            }
            setText(String(normalizeValue(clampReplyDelaySeconds(parsed))))
          }}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="pr-20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-muted-foreground">
          segundos
        </span>
      </div>
    </div>
  )
}

interface ReplyDelayEditorProps {
  value: AiSettingsReplyDelay
  error?: string
  onChange: (value: AiSettingsReplyDelay) => void
}

export function ReplyDelayEditor({ value, error, onChange }: ReplyDelayEditorProps) {
  const helpId = 'reply-delay-help'
  const previewId = 'reply-delay-preview'
  const errorId = error ? 'reply-delay-error' : undefined
  const describedBy = [helpId, previewId, errorId].filter(Boolean).join(' ')

  function updateMin(nextMin: number) {
    onChange({
      minSeconds: nextMin,
      maxSeconds: Math.max(value.maxSeconds, nextMin),
    })
  }

  function updateMax(nextMax: number) {
    onChange({
      minSeconds: value.minSeconds,
      maxSeconds: Math.max(value.minSeconds, nextMax),
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SecondsInput
          id="reply-delay-min"
          label="Mínimo"
          value={value.minSeconds}
          describedBy={describedBy}
          invalid={Boolean(error)}
          normalizeValue={(next) => next}
          onChange={updateMin}
        />
        <SecondsInput
          id="reply-delay-max"
          label="Máximo"
          value={value.maxSeconds}
          describedBy={describedBy}
          invalid={Boolean(error)}
          normalizeValue={(next) => Math.max(value.minSeconds, next)}
          onChange={updateMax}
        />
      </div>

      <p id={helpId} className="text-[12px] leading-5 text-muted-foreground">
        El asistente espera un tiempo al azar entre estos valores antes de responder, para que no
        sea instantáneo. Mientras espera, el cliente ve «escribiendo…». Usa 0 y 0 para responder de
        inmediato.
      </p>

      <p
        id={previewId}
        role="status"
        aria-label="Vista previa del tiempo de respuesta"
        className="rounded-md border border-border bg-sheet px-3 py-2 text-[12px] leading-5 text-muted-foreground"
      >
        Responderá entre{' '}
        <span className="num font-medium text-foreground">{formatSeconds(value.minSeconds)}</span> y{' '}
        <span className="num font-medium text-foreground">{formatSeconds(value.maxSeconds)}</span>{' '}
        segundos después de recibir el mensaje.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ minSeconds: 0, maxSeconds: 0 })}
        >
          <ZapIcon className="size-3.5" aria-hidden="true" />
          Inmediato
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...DEFAULT_REPLY_DELAY })}
        >
          <RotateCcwIcon className="size-3.5" aria-hidden="true" />
          Restablecer
        </Button>
      </div>

      {error ? (
        <p id={errorId} className="text-[12px] leading-4 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
