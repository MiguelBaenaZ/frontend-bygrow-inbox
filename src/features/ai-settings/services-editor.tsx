import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/features/ai-settings/form-parts'
import type { AiSettingsFieldErrors } from '@/features/ai-settings/ai-settings-utils'
import type { AiService, AiSettingsLimits } from '@/types/api'

interface ServicesEditorProps {
  services: AiService[]
  limits: AiSettingsLimits
  errors: AiSettingsFieldErrors
  onChange: (services: AiService[]) => void
}

export function ServicesEditor({ services, limits, errors, onChange }: ServicesEditorProps) {
  const atLimit = services.length >= limits.maxServices

  function updateService(index: number, patch: Partial<AiService>) {
    onChange(
      services.map((service, currentIndex) =>
        currentIndex === index ? { ...service, ...patch } : service,
      ),
    )
  }

  function removeService(index: number) {
    onChange(services.filter((_, currentIndex) => currentIndex !== index))
  }

  function moveService(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= services.length) return
    const next = [...services]
    const current = next[index]
    const swap = next[target]
    if (!current || !swap) return
    next[index] = swap
    next[target] = current
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-[440px] text-[12px] leading-5 text-muted-foreground">
          El asistente usará solo esta información para precios y condiciones.
        </p>
        <span className="num text-[11px] text-muted-foreground">
          {services.length} / {limits.maxServices} servicios
        </span>
      </div>

      {errors.services ? <p className="text-[12px] text-destructive">{errors.services}</p> : null}

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center">
          <p className="text-[13px] text-muted-foreground">
            Aún no hay servicios. Agrega el primero para que el asistente pueda cotizarlo.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {services.map((service, index) => {
            const baseId = `service-${index}`
            return (
              <li key={index} className="rounded-xl border border-border bg-sheet p-3 sm:p-4">
                <fieldset className="relative m-0 min-w-0 border-0 p-0">
                  <legend className="sr-only">Servicio {index + 1}</legend>

                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-foreground">Servicio {index + 1}</p>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Mover servicio ${index + 1} hacia arriba`}
                        disabled={index === 0}
                        onClick={() => moveService(index, -1)}
                      >
                        <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Mover servicio ${index + 1} hacia abajo`}
                        disabled={index === services.length - 1}
                        onClick={() => moveService(index, 1)}
                      >
                        <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:bg-danger-soft hover:text-danger-ink"
                        aria-label={`Eliminar servicio ${index + 1}`}
                        onClick={() => removeService(index)}
                      >
                        <Trash2Icon className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      id={`${baseId}-name`}
                      label="Nombre"
                      value={service.name}
                      max={limits.short}
                      error={errors[`services.${index}.name`]}
                    >
                      {(aria) => (
                        <Input
                          id={`${baseId}-name`}
                          value={service.name}
                          onChange={(event) => updateService(index, { name: event.target.value })}
                          placeholder="Consulta inicial"
                          autoComplete="off"
                          {...aria}
                        />
                      )}
                    </Field>

                    <Field
                      id={`${baseId}-price`}
                      label="Precio"
                      value={service.price}
                      max={limits.short}
                      error={errors[`services.${index}.price`]}
                    >
                      {(aria) => (
                        <Input
                          id={`${baseId}-price`}
                          value={service.price}
                          onChange={(event) => updateService(index, { price: event.target.value })}
                          placeholder="Desde $150.000"
                          autoComplete="off"
                          {...aria}
                        />
                      )}
                    </Field>

                    <div className="sm:col-span-2">
                      <Field
                        id={`${baseId}-description`}
                        label="Descripción"
                        value={service.description}
                        max={limits.medium}
                        error={errors[`services.${index}.description`]}
                        hint="Qué incluye, para quién es y cualquier condición relevante."
                      >
                        {(aria) => (
                          <Textarea
                            id={`${baseId}-description`}
                            value={service.description}
                            onChange={(event) =>
                              updateService(index, { description: event.target.value })
                            }
                            placeholder="Sesión de diagnóstico de 45 minutos..."
                            className="min-h-20"
                            {...aria}
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                </fieldset>
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={atLimit}
          onClick={() => onChange([...services, { name: '', description: '', price: '' }])}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Agregar servicio
        </Button>
        {atLimit ? (
          <p className="text-[11px] text-muted-foreground">
            Llegaste al máximo de {limits.maxServices} servicios.
          </p>
        ) : null}
      </div>
    </div>
  )
}
