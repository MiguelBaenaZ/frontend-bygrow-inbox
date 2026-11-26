import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { characterCount } from '@/features/ai-settings/ai-settings-utils'
import { cn } from '@/lib/utils'

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  tone = 'default',
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const isDanger = tone === 'danger'

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        'scroll-mt-4 rounded-2xl border p-4 sm:p-5',
        isDanger ? 'border-destructive/25 bg-danger-soft/20' : 'border-border bg-raised/45',
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(190px,0.62fr)_minmax(0,1.38fr)] lg:gap-8">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl border bg-sheet shadow-[0_1px_2px_rgba(7,17,12,0.04)]',
              isDanger ? 'border-destructive/20 text-destructive' : 'border-border/80 text-primary',
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-[15px] leading-5 font-semibold text-foreground">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 max-w-[340px] text-[12px] leading-5 text-muted-foreground sm:text-[13px]"
            >
              {description}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'min-w-0 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8',
            isDanger ? 'border-destructive/15' : 'border-border/80',
          )}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

export function CharacterCount({ id, value, max }: { id?: string; value: string; max: number }) {
  const count = characterCount(value)
  const overLimit = count > max

  return (
    <span
      id={id}
      className={cn(
        'num text-[11px] leading-4 whitespace-nowrap',
        overLimit ? 'font-medium text-destructive' : 'text-muted-foreground',
      )}
    >
      {count} / {max}
    </span>
  )
}

export interface FieldControlAria {
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FieldProps {
  id: string
  label: string
  value: string
  error?: string
  hint?: string
  max?: number
  children: (aria: FieldControlAria) => ReactNode
}

/**
 * Campo con label asociado, contador opcional, ayuda y error accesible.
 * El control se recibe como función para compartir los ids de descripción.
 */
export function Field({ id, label, value, error, hint, max, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const countId = max === undefined ? undefined : `${id}-count`
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, countId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label htmlFor={id}>{label}</Label>
        {max === undefined ? null : <CharacterCount id={countId} value={value} max={max} />}
      </div>
      {children({ 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint ? (
        <p id={hintId} className="text-[11px] leading-4 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[12px] leading-4 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
