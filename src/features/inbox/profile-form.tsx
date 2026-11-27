import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  buildProfilePatch,
  normalizeProfile,
  profileListFields,
  profileTextFields,
  PROFILE_TEXT_MAX,
  validateProfileDraft,
  type ProfileListKey,
  type ProfileTextField,
} from '@/features/inbox/profile-utils'
import { ApiError, chatsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import type { ChatDetailResponse, ChatProfile, ChatProfilePatch } from '@/types/api'

interface ProfileFormProps {
  chatId: string
  profile: ChatProfile
  onCancel: () => void
  onSaved: () => void
}

interface ProfileFormError {
  message: string
  details: string[]
}

const profileAutoComplete: Partial<Record<ProfileTextField, string>> = {
  name: 'name',
  company: 'organization',
  email: 'email',
  city: 'address-level2',
}

interface FieldShellProps {
  id: string
  label: string
  value: string
  max: number
  error?: string
  hideLabel?: boolean
  children: (aria: { 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => ReactNode
}

function FieldShell({
  id,
  label,
  value,
  max,
  error,
  hideLabel = false,
  children,
}: FieldShellProps) {
  const count = value.trim().length
  const overLimit = count > max
  const countId = `${id}-count`
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [countId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
          {label}
        </Label>
        <span
          id={countId}
          className={cn(
            'num text-[11px] leading-4 whitespace-nowrap',
            overLimit ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {count} / {max}
        </span>
      </div>
      {children({ 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={errorId} className="text-[11px] leading-3 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ProfileForm({ chatId, profile, onCancel, onSaved }: ProfileFormProps) {
  const queryClient = useQueryClient()
  const [baseline] = useState(() => normalizeProfile(profile))
  const [draft, setDraft] = useState<ChatProfile>(() => normalizeProfile(profile))
  const [formError, setFormError] = useState<ProfileFormError | null>(null)

  const validation = useMemo(() => validateProfileDraft(draft), [draft])
  const patch = useMemo(() => buildProfilePatch(baseline, draft), [baseline, draft])
  const hasChanges = Object.keys(patch).length > 0

  const save = useMutation({
    mutationFn: async (changes: ChatProfilePatch) => {
      const response = await chatsApi.updateProfile(chatId, changes)
      if (!response.ok) throw new Error('profile_update_failed')
      return response
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId), (current) =>
        current ? { ...current, profile: response.profile } : current,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      toast.success('Datos del cliente actualizados')
      onSaved()
    },
    onError: (error: Error) => {
      setFormError({
        message: getErrorMessage(error, 'No se pudo guardar la ficha del cliente.'),
        details: error instanceof ApiError ? (error.details ?? []) : [],
      })
    },
  })

  function updateText(key: ProfileTextField, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateItem(key: ProfileListKey, index: number, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, currentIndex) => (currentIndex === index ? value : item)),
    }))
  }

  function addItem(key: ProfileListKey) {
    setDraft((current) => ({ ...current, [key]: [...current[key], ''] }))
  }

  function removeItem(key: ProfileListKey, index: number) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChanges || !validation.valid || save.isPending) return
    setFormError(null)
    save.mutate(patch)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-4">
      <div className="space-y-3">
        {profileTextFields.map((field) => {
          const multiline =
            field.key === 'business' || field.key === 'customers' || field.key === 'channels'
          const id = `profile-${field.key}`

          return (
            <FieldShell
              key={field.key}
              id={id}
              label={field.label}
              value={draft[field.key]}
              max={PROFILE_TEXT_MAX}
              error={validation.fieldErrors[field.key]}
            >
              {(aria) =>
                multiline ? (
                  <Textarea
                    id={id}
                    value={draft[field.key]}
                    onChange={(event) => updateText(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    className="min-h-16 text-[13px]"
                    disabled={save.isPending}
                    {...aria}
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.key === 'email' ? 'email' : 'text'}
                    value={draft[field.key]}
                    onChange={(event) => updateText(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    autoComplete={profileAutoComplete[field.key] ?? 'off'}
                    disabled={save.isPending}
                    {...aria}
                  />
                )
              }
            </FieldShell>
          )
        })}
      </div>

      {profileListFields.map((field) => {
        const items = draft[field.key]
        const atLimit = items.length >= field.max
        const listError = validation.fieldErrors[field.key]

        return (
          <div key={field.key} className="space-y-2 rounded-lg border border-border/70 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[12px] font-medium text-foreground">{field.label}</h4>
              <span className="num text-[11px] text-muted-foreground">
                {items.length} / {field.max}
              </span>
            </div>

            {items.length > 0 ? (
              <ol className="space-y-2">
                {items.map((item, index) => {
                  const id = `profile-${field.key}-${index}`
                  const itemLabel = `${field.singular.charAt(0).toLocaleUpperCase('es-CO')}${field.singular.slice(1)} ${index + 1}`
                  return (
                    <li key={index} className="flex items-start gap-1.5">
                      <span className="num mt-2 w-3 shrink-0 text-right text-[11px] text-muted-foreground">
                        {index + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <FieldShell
                          id={id}
                          label={itemLabel}
                          value={item}
                          max={PROFILE_TEXT_MAX}
                          error={validation.fieldErrors[`${field.key}.${index}`]}
                          hideLabel
                        >
                          {(aria) =>
                            field.multiline ? (
                              <Textarea
                                id={id}
                                value={item}
                                onChange={(event) =>
                                  updateItem(field.key, index, event.target.value)
                                }
                                placeholder={field.placeholder}
                                rows={2}
                                className="min-h-14 text-[13px]"
                                disabled={save.isPending}
                                {...aria}
                              />
                            ) : (
                              <Input
                                id={id}
                                value={item}
                                onChange={(event) =>
                                  updateItem(field.key, index, event.target.value)
                                }
                                placeholder={field.placeholder}
                                disabled={save.isPending}
                                {...aria}
                              />
                            )
                          }
                        </FieldShell>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-5 shrink-0 text-muted-foreground hover:bg-danger-soft hover:text-danger-ink"
                        aria-label={`Eliminar ${itemLabel.toLocaleLowerCase('es-CO')}`}
                        onClick={() => removeItem(field.key, index)}
                        disabled={save.isPending}
                      >
                        <Trash2Icon className="size-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="text-[11px] leading-4 text-muted-foreground">
                Sin {field.plural} registrados.
              </p>
            )}

            {listError ? (
              <p className="text-[11px] leading-3 text-destructive">{listError}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={atLimit || save.isPending}
                onClick={() => addItem(field.key)}
              >
                <PlusIcon className="size-3" aria-hidden="true" />
                Agregar {field.singular}
              </Button>
              {atLimit ? (
                <p className="text-[11px] text-muted-foreground">
                  Máximo {field.max} {field.plural}.
                </p>
              ) : null}
            </div>
          </div>
        )
      })}

      <div aria-live="polite">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-[12px] leading-5 text-danger-ink"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p>{formError.message}</p>
              {formError.details.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {formError.details.map((detail, index) => (
                    <li key={`${detail}-${index}`}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {!validation.valid ? (
        <p className="text-[11px] leading-4 text-destructive">
          Revisa los campos marcados antes de guardar.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={save.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!hasChanges || !validation.valid || save.isPending}
        >
          {save.isPending ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
