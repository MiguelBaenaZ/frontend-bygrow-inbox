import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  SearchIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { QueryError } from '@/components/query-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useTemplatesQuery } from '@/features/inbox/queries'
import { inboxApi } from '@/lib/api'
import { getErrorCode, getErrorMessage } from '@/lib/errors'
import {
  formatTemplateCategory,
  formatTemplateLanguage,
  formatTemplateSummary,
} from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { cn, normalizeSearch } from '@/lib/utils'
import type { ConversationMeta, TemplateInfo } from '@/types/api'

interface TemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  chatName: string
  meta: ConversationMeta
  now: number
  onRequestOptIn: () => void
}

const emptyParams = (count: number): string[] => Array.from({ length: count }, () => '')

function templateKey(template: TemplateInfo): string {
  return `${template.name}:${template.language}`
}

export function TemplatesDialog({
  open,
  onOpenChange,
  chatId,
  chatName,
  meta,
  now,
  onRequestOptIn,
}: TemplatesDialogProps) {
  const queryClient = useQueryClient()
  const templatesQuery = useTemplatesQuery(open)
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [params, setParams] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const windowOpenNow = meta.expiresAt ? meta.expiresAt > now : meta.windowOpen

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
  const filteredTemplates = useMemo(() => {
    const term = normalizeSearch(search)
    if (!term) return templates
    return templates.filter((template) =>
      normalizeSearch(
        `${template.name} ${template.preview} ${template.category} ${template.language}`,
      ).includes(term),
    )
  }, [search, templates])

  const selectedTemplate = useMemo(
    () => templates.find((template) => templateKey(template) === selectedKey) ?? null,
    [selectedKey, templates],
  )

  const sendTemplate = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) throw new Error('template_required')
      return inboxApi.sendTemplate(chatId, {
        name: selectedTemplate.name,
        language: selectedTemplate.language,
        params: selectedTemplate.params > 0 ? params.map((param) => param.trim()) : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      toast.success('Mensaje enviado')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      const code = getErrorCode(error)
      if (code === 'opt_out') {
        toast.error('El contacto pidió no recibir mensajes')
        return
      }
      if (code === 'opt_in_required' || code === 'marketing_opt_in_required') {
        toast.error(getErrorMessage(error), {
          action: {
            label: 'Registrar opt-in',
            onClick: () => {
              onOpenChange(false)
              onRequestOptIn()
            },
          },
        })
        return
      }
      if (code === 'window_closed') {
        toast.error('La ventana de 24 h está cerrada')
        return
      }
      setFormError(getErrorMessage(error, 'No se pudo enviar la plantilla.'))
      toast.error(getErrorMessage(error, 'No se pudo enviar la plantilla.'))
    },
  })

  function chooseTemplate(template: TemplateInfo) {
    setSelectedKey(templateKey(template))
    setParams(emptyParams(template.params))
    setFormError(null)
  }

  function send() {
    if (!selectedTemplate) {
      setFormError('Elige una plantilla')
      return
    }
    if (meta.optOut) {
      setFormError('El contacto pidió no recibir mensajes')
      return
    }
    if (params.some((param) => !param.trim())) {
      setFormError('Completa todas las variables de la plantilla')
      return
    }
    setFormError(null)
    sendTemplate.mutate()
  }

  const optInLikelyRequired =
    !meta.optIn &&
    (selectedTemplate?.category.toUpperCase() === 'MARKETING' || !windowOpenNow)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Usar plantilla</DialogTitle>
          <DialogDescription>
            Plantillas aprobadas por Meta para escribirle a {chatName}, incluso fuera de la
            ventana de 24 horas.
          </DialogDescription>
        </DialogHeader>

        {templatesQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-lg" />
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ) : null}

        {templatesQuery.isError && !templatesQuery.isLoading ? (
          <QueryError
            title="No se pudieron cargar las plantillas"
            description="Meta no respondió o no hay plantillas disponibles para la cuenta."
            onRetry={() => templatesQuery.refetch()}
            compact
          />
        ) : null}

        {!templatesQuery.isLoading && !templatesQuery.isError ? (
          templates.length === 0 ? (
            <EmptyState
              icon={MessageSquareTextIcon}
              title="No hay plantillas aprobadas"
              description="La cuenta de WhatsApp Business no tiene plantillas aprobadas para enviar."
              compact
            />
          ) : (
            <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="min-w-0">
                <div className="relative mb-2">
                  <label htmlFor="template-search" className="sr-only">
                    Buscar plantillas
                  </label>
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="template-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar plantilla"
                    className="h-8 pl-8 text-[13px]"
                    autoComplete="off"
                  />
                </div>

                <div
                  className="max-h-[330px] space-y-1 overflow-y-auto pr-1"
                  aria-label="Plantillas aprobadas"
                >
                  {filteredTemplates.map((template) => {
                    const selected = templateKey(template) === selectedKey
                    return (
                      <button
                        key={templateKey(template)}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseTemplate(template)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          selected
                            ? 'border-primary/40 bg-active'
                            : 'border-border bg-sheet hover:bg-muted/65',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">
                            {template.name}
                          </span>
                          {selected ? (
                            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatTemplateSummary(template)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-muted-foreground">
                          {template.preview || 'Sin vista previa del cuerpo.'}
                        </p>
                      </button>
                    )
                  })}
                  {filteredTemplates.length === 0 ? (
                    <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                      No hay plantillas que coincidan con la búsqueda.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-raised/60 p-4">
                {selectedTemplate ? (
                  <div className="flex h-full flex-col">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          {formatTemplateCategory(selectedTemplate.category)}
                        </Badge>
                        <Badge variant="neutral">
                          {formatTemplateLanguage(selectedTemplate.language)}
                        </Badge>
                      </div>
                      <h3 className="mt-2 font-display text-lg leading-tight font-semibold tracking-tight">
                        {selectedTemplate.name}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatTemplateSummary(selectedTemplate)}
                      </p>

                      <div className="mt-3 rounded-md border border-border bg-sheet p-3">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Vista previa
                        </p>
                        <p className="mt-1.5 text-[12px] leading-5 whitespace-pre-wrap text-foreground">
                          {selectedTemplate.preview || 'Plantilla sin texto de vista previa.'}
                        </p>
                      </div>

                      {selectedTemplate.params > 0 ? (
                        <div className="mt-4 space-y-2.5">
                          <p className="text-[12px] font-medium text-foreground">
                            Variables de la plantilla
                          </p>
                          {params.map((value, index) => (
                            <div key={index} className="space-y-1">
                              <Label htmlFor={`template-param-${index}`}>
                                {`Variable {{${index + 1}}}`}
                              </Label>
                              <Input
                                id={`template-param-${index}`}
                                value={value}
                                onChange={(event) => {
                                  const nextValue = event.target.value
                                  setParams((current) =>
                                    current.map((param, paramIndex) =>
                                      paramIndex === index ? nextValue : param,
                                    ),
                                  )
                                  if (formError) setFormError(null)
                                }}
                                placeholder="Escribe el valor"
                                className="h-8 text-[13px]"
                                disabled={sendTemplate.isPending}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-[12px] text-muted-foreground">
                          Esta plantilla no tiene variables.
                        </p>
                      )}

                      {meta.optOut ? (
                        <p className="mt-3 rounded-md bg-danger-soft px-2.5 py-2 text-[11px] leading-4 text-danger-ink">
                          El contacto pidió no recibir mensajes. No se puede enviar ninguna
                          plantilla.
                        </p>
                      ) : optInLikelyRequired ? (
                        <p className="mt-3 rounded-md bg-warning-soft px-2.5 py-2 text-[11px] leading-4 text-warning-ink">
                          Para esta plantilla puede hacer falta un opt-in explícito. Si el envío
                          falla, regístralo en el detalle del contacto.
                        </p>
                      ) : null}

                      {formError ? (
                        <p role="alert" className="mt-2 text-[12px] text-destructive">
                          {formError}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto pt-4">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={send}
                        disabled={sendTemplate.isPending || meta.optOut}
                      >
                        {sendTemplate.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {sendTemplate.isPending ? 'Enviando…' : 'Enviar plantilla'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquareTextIcon}
                    title="Elige una plantilla"
                    description="Selecciona una plantilla de la lista para revisar su contenido y completar sus variables."
                    compact
                  />
                )}
              </div>
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
