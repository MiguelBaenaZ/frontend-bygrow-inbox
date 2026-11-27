import { useMutation } from '@tanstack/react-query'
import {
  BookOpenIcon,
  BotIcon,
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  EyeIcon,
  HistoryIcon,
  LightbulbIcon,
  Loader2Icon,
  MessageCircleHeartIcon,
  MessageSquareTextIcon,
  PackageIcon,
  RotateCcwIcon,
  SaveIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  SlidersHorizontalIcon,
  TimerIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { QueryError } from '@/components/query-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  DEFAULT_TEMPERATURE,
  MAX_TOKENS_MAX,
  MAX_TOKENS_MIN,
  describeAiSettingsError,
  hasAiSettingsChanges,
  isForbiddenError,
  normalizeAiSettings,
  validateAiSettings,
} from '@/features/ai-settings/ai-settings-utils'
import { BotMessagesEditor } from '@/features/ai-settings/bot-messages-editor'
import { ErrorNotice } from '@/features/ai-settings/error-notice'
import { Field, SettingsSection } from '@/features/ai-settings/form-parts'
import { HistoryDialog } from '@/features/ai-settings/history-dialog'
import { PromptPreviewDialog } from '@/features/ai-settings/prompt-preview-dialog'
import { useAiSettingsQuery } from '@/features/ai-settings/queries'
import { ReplyDelayEditor } from '@/features/ai-settings/reply-delay-editor'
import { RulesEditor } from '@/features/ai-settings/rules-editor'
import { ServicesEditor } from '@/features/ai-settings/services-editor'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { aiSettingsApi } from '@/lib/api'
import { formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AiSettings, AiSettingsMutationResponse, AiSettingsResponse } from '@/types/api'

const sectionLinks = [
  { id: 'ai-section-identity', label: 'Identidad', icon: Building2Icon },
  { id: 'ai-section-tone', label: 'Tono', icon: MessageCircleHeartIcon },
  { id: 'ai-section-hours', label: 'Horario', icon: ClockIcon },
  { id: 'ai-section-services', label: 'Servicios', icon: PackageIcon },
  { id: 'ai-section-knowledge', label: 'Conocimiento', icon: BookOpenIcon },
  { id: 'ai-section-rules', label: 'Reglas', icon: ShieldCheckIcon },
  { id: 'ai-section-instructions', label: 'Instrucciones', icon: LightbulbIcon },
  { id: 'ai-section-messages', label: 'Mensajes', icon: MessageSquareTextIcon },
  { id: 'ai-section-reply-delay', label: 'Tiempo de respuesta', icon: TimerIcon },
  { id: 'ai-section-advanced', label: 'Avanzado', icon: SlidersHorizontalIcon },
] as const

interface EditorFeedback {
  kind: 'success' | 'error'
  message: string
  details?: string[]
  retryable?: boolean
}

function feedbackFromError(error: unknown, fallback: string): EditorFeedback {
  const info = describeAiSettingsError(error, fallback)
  return {
    kind: 'error',
    message: info.message,
    details: info.details,
    retryable: info.retryable,
  }
}

function AiSettingsSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la configuración del asistente</span>
      <div className="mx-auto w-full max-w-[1040px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-raised/45 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(190px,0.62fr)_minmax(0,1.38fr)] lg:gap-8">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="space-y-3 border-t border-border/80 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiSettingsLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isForbiddenError(error)) {
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      >
        <ShieldXIcon className="mb-3 size-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-display text-2xl font-semibold tracking-tight">Acceso restringido</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Solo un administrador puede ver y cambiar la configuración del asistente de IA.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/inbox">Volver a la bandeja</Link>
        </Button>
      </div>
    )
  }

  const info = describeAiSettingsError(
    error,
    'No se pudo cargar la configuración del asistente. Revisa tu conexión e inténtalo de nuevo.',
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <QueryError
        title="No se pudo cargar la configuración"
        description={info.message}
        onRetry={onRetry}
      />
    </div>
  )
}

export function AiSettingsPage() {
  const settingsQuery = useAiSettingsQuery()
  useDocumentTitle('Asistente de IA')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[72px] shrink-0 items-center border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary ring-1 ring-primary/10">
            <BotIcon className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[23px] leading-none font-semibold tracking-[-0.04em]">
              Asistente de IA
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Configura cómo se presenta, qué sabe y cómo responde el asistente de WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {settingsQuery.isLoading ? <AiSettingsSkeleton /> : null}

      {!settingsQuery.isLoading && settingsQuery.isError ? (
        <AiSettingsLoadError
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.isError && settingsQuery.data ? (
        <AiSettingsEditor initial={settingsQuery.data} />
      ) : null}
    </div>
  )
}

function AiSettingsEditor({ initial }: { initial: AiSettingsResponse }) {
  const { limits } = initial
  const defaults = initial.defaults.messages
  const now = useNow(30_000)

  const [settings, setSettings] = useState<AiSettings>(() => normalizeAiSettings(initial.settings))
  const [baseline, setBaseline] = useState<AiSettings>(() => normalizeAiSettings(initial.settings))
  const [version, setVersion] = useState(initial.version)
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt)
  const [feedback, setFeedback] = useState<EditorFeedback | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>(sectionLinks[0].id)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const errors = useMemo(() => validateAiSettings(settings, limits), [settings, limits])
  const errorCount = Object.keys(errors).length
  const isDirty = useMemo(() => hasAiSettingsChanges(settings, baseline), [settings, baseline])

  // Un 401 debe poder llevarnos al login aunque haya cambios sin guardar.
  const blocker = useBlocker(({ nextLocation }) => isDirty && nextLocation.pathname !== '/login')

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const scrollContainer: HTMLDivElement = container

    function updateActiveSection() {
      const threshold = scrollContainer.getBoundingClientRect().top + 88
      let current: string = sectionLinks[0].id

      for (const link of sectionLinks) {
        const element = document.getElementById(link.id)
        if (element && element.getBoundingClientRect().top <= threshold) {
          current = link.id
        }
      }

      if (
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 16
      ) {
        current = sectionLinks[sectionLinks.length - 1].id
      }

      setActiveSection(current)
    }

    updateActiveSection()
    scrollContainer.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', updateActiveSection)
  }, [])

  function scrollToSection(id: string) {
    const container = scrollRef.current
    const target = document.getElementById(id)
    if (!container || !target) return

    const containerTop = container.getBoundingClientRect().top
    const targetTop = target.getBoundingClientRect().top - containerTop + container.scrollTop - 12
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    } else {
      container.scrollTop = Math.max(0, targetTop)
    }
    setActiveSection(id)
  }

  function applyServerResponse(response: AiSettingsMutationResponse, message: string) {
    const next = normalizeAiSettings(response.settings)
    setSettings(next)
    setBaseline(next)
    setVersion(response.version)
    setUpdatedAt(response.updatedAt)
    setFeedback({ kind: 'success', message })
  }

  function updateSettings(updater: (current: AiSettings) => AiSettings) {
    setSettings((current) => updater(current))
    setFeedback((current) => (current?.kind === 'success' ? null : current))
  }

  function patchSettings(patch: Partial<AiSettings>) {
    updateSettings((current) => ({ ...current, ...patch }))
  }

  const saveSettings = useMutation({
    mutationFn: (payload: AiSettings) => aiSettingsApi.update(payload),
    onSuccess: (response) => {
      applyServerResponse(response, 'Configuración guardada correctamente.')
      toast.success('Configuración guardada')
    },
    onError: (error) => {
      setFeedback(
        feedbackFromError(
          error,
          'No se pudo guardar la configuración. Revisa tu conexión e inténtalo de nuevo.',
        ),
      )
    },
  })

  const previewSettings = useMutation({
    mutationFn: (payload: AiSettings) => aiSettingsApi.preview(payload),
  })

  const resetSettings = useMutation({
    mutationFn: () => aiSettingsApi.reset(),
    onSuccess: (response) => {
      applyServerResponse(response, 'Configuración restablecida a los valores por defecto.')
      setResetOpen(false)
      toast.success('Configuración restablecida')
    },
    onError: (error) => {
      setResetOpen(false)
      setFeedback(
        feedbackFromError(error, 'No se pudo restablecer la configuración. Inténtalo de nuevo.'),
      )
    },
  })

  const isSaving = saveSettings.isPending
  const isBusy = saveSettings.isPending || resetSettings.isPending
  const canSave = isDirty && errorCount === 0 && !isSaving
  const relativeUpdatedAt = updatedAt ? formatRelative(updatedAt, now) : 'sin fecha registrada'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isDirty || errorCount > 0 || isSaving) return
    setFeedback(null)
    saveSettings.mutate(normalizeAiSettings(settings))
  }

  function retrySave() {
    saveSettings.mutate(normalizeAiSettings(settings))
  }

  function openPreview() {
    setPreviewOpen(true)
    previewSettings.mutate(normalizeAiSettings(settings))
  }

  function retryPreview() {
    previewSettings.mutate(normalizeAiSettings(settings))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        aria-label="Accesos rápidos a las secciones"
        className="shrink-0 border-b border-border bg-sheet px-4 py-2.5 sm:px-5"
      >
        <div className="mx-auto flex w-full max-w-[1040px] items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 pr-7 sm:flex-wrap sm:overflow-visible sm:pr-0">
              {sectionLinks.map(({ id, label, icon: Icon }) => {
                const isActive = activeSection === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-controls={id}
                    aria-current={isActive ? 'true' : undefined}
                    title={`Ir a ${label}`}
                    onClick={() => scrollToSection(id)}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      isActive
                        ? 'border-primary/30 bg-active text-foreground'
                        : 'border-border bg-sheet text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-3.5',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                )
              })}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-sheet to-transparent sm:hidden"
              aria-hidden="true"
            />
          </div>
        </div>
      </nav>

      {/* relative contiene los elementos sr-only absolutos y evita scroll fantasma */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <form id="ai-settings-form" onSubmit={handleSubmit} noValidate className="min-w-0">
          <fieldset disabled={isBusy} className="m-0 min-w-0 border-0 p-0">
            <div className="mx-auto w-full max-w-[1040px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
              <SettingsSection
                id="ai-section-identity"
                icon={Building2Icon}
                title="Identidad"
                description="El nombre con el que se presenta el asistente y el negocio que representa."
              >
                <div className="space-y-4">
                  <Field
                    id="assistant-name"
                    label="Nombre del asistente"
                    value={settings.assistantName}
                    max={limits.short}
                    error={errors.assistantName}
                    hint="Así se presenta el asistente en la conversación."
                  >
                    {(aria) => (
                      <Input
                        id="assistant-name"
                        value={settings.assistantName}
                        onChange={(event) => patchSettings({ assistantName: event.target.value })}
                        placeholder="Por ejemplo, Ana de ByGrow"
                        autoComplete="off"
                        {...aria}
                      />
                    )}
                  </Field>

                  <Field
                    id="business-name"
                    label="Nombre del negocio"
                    value={settings.businessName}
                    max={limits.short}
                    error={errors.businessName}
                  >
                    {(aria) => (
                      <Input
                        id="business-name"
                        value={settings.businessName}
                        onChange={(event) => patchSettings({ businessName: event.target.value })}
                        placeholder="ByGrow"
                        autoComplete="off"
                        {...aria}
                      />
                    )}
                  </Field>

                  <Field
                    id="business-description"
                    label="Descripción del negocio"
                    value={settings.businessDescription}
                    max={limits.medium}
                    error={errors.businessDescription}
                  >
                    {(aria) => (
                      <Textarea
                        id="business-description"
                        value={settings.businessDescription}
                        onChange={(event) =>
                          patchSettings({ businessDescription: event.target.value })
                        }
                        placeholder="A qué se dedica el negocio, a quién atiende y qué lo diferencia."
                        className="min-h-24"
                        {...aria}
                      />
                    )}
                  </Field>
                </div>
              </SettingsSection>

              <SettingsSection
                id="ai-section-tone"
                icon={MessageCircleHeartIcon}
                title="Personalidad y tono"
                description="La forma de hablar del asistente: cercanía, formalidad y estilo de las respuestas."
              >
                <Field
                  id="personality"
                  label="Personalidad y tono"
                  value={settings.personality}
                  max={limits.long}
                  error={errors.personality}
                  hint="Si lo dejas vacío se usa el comportamiento por defecto del sistema."
                >
                  {(aria) => (
                    <Textarea
                      id="personality"
                      value={settings.personality}
                      onChange={(event) => patchSettings({ personality: event.target.value })}
                      placeholder="Cercano, claro y profesional. Usa frases cortas, tutea con respeto y evita sonar insistente."
                      className="min-h-[180px]"
                      {...aria}
                    />
                  )}
                </Field>
              </SettingsSection>

              <SettingsSection
                id="ai-section-hours"
                icon={ClockIcon}
                title="Horario de atención"
                description="Cuándo hay personas disponibles para responder."
              >
                <Field
                  id="business-hours"
                  label="Horario de atención"
                  value={settings.businessHours}
                  max={limits.short}
                  error={errors.businessHours}
                  hint="El asistente puede usar este horario para responder sobre disponibilidad."
                >
                  {(aria) => (
                    <Textarea
                      id="business-hours"
                      value={settings.businessHours}
                      onChange={(event) => patchSettings({ businessHours: event.target.value })}
                      placeholder="Lunes a viernes, 8:00 a. m. a 6:00 p. m. Sábados, 9:00 a. m. a 1:00 p. m."
                      className="min-h-20"
                      {...aria}
                    />
                  )}
                </Field>
              </SettingsSection>

              <SettingsSection
                id="ai-section-services"
                icon={PackageIcon}
                title="Servicios y productos"
                description="El catálogo que el asistente puede mencionar, cotizar y recomendar."
              >
                <ServicesEditor
                  services={settings.services}
                  limits={limits}
                  errors={errors}
                  onChange={(services) => patchSettings({ services })}
                />
              </SettingsSection>

              <SettingsSection
                id="ai-section-knowledge"
                icon={BookOpenIcon}
                title="Conocimiento del negocio"
                description="La información de referencia que el asistente debe conocer para responder con precisión."
              >
                <Field
                  id="knowledge"
                  label="Información para el asistente"
                  value={settings.knowledge}
                  max={limits.long}
                  error={errors.knowledge}
                  hint="Incluye preguntas frecuentes, políticas, formas de pago, cobertura y datos de contacto."
                >
                  {(aria) => (
                    <Textarea
                      id="knowledge"
                      value={settings.knowledge}
                      onChange={(event) => patchSettings({ knowledge: event.target.value })}
                      placeholder="Preguntas frecuentes, políticas de cancelación, métodos de pago, zonas de cobertura, datos de contacto…"
                      className="min-h-[220px]"
                      {...aria}
                    />
                  )}
                </Field>
              </SettingsSection>

              <SettingsSection
                id="ai-section-rules"
                icon={ShieldCheckIcon}
                title="Reglas"
                description="Límites y condiciones que el asistente no debe romper."
              >
                <RulesEditor
                  rules={settings.rules}
                  limits={limits}
                  errors={errors}
                  onChange={(rules) => patchSettings({ rules })}
                />
              </SettingsSection>

              <SettingsSection
                id="ai-section-instructions"
                icon={LightbulbIcon}
                title="Instrucciones adicionales"
                description="Indicaciones libres que no encajan en las otras secciones."
              >
                <Field
                  id="extra-instructions"
                  label="Instrucciones adicionales"
                  value={settings.extraInstructions}
                  max={limits.long}
                  error={errors.extraInstructions}
                  hint="Solo se usan si aportan algo distinto a las reglas y el conocimiento."
                >
                  {(aria) => (
                    <Textarea
                      id="extra-instructions"
                      value={settings.extraInstructions}
                      onChange={(event) => patchSettings({ extraInstructions: event.target.value })}
                      placeholder="Por ejemplo, cómo cerrar una conversación o qué hacer cuando no sabes la respuesta."
                      className="min-h-28"
                      {...aria}
                    />
                  )}
                </Field>
              </SettingsSection>

              <SettingsSection
                id="ai-section-messages"
                icon={MessageSquareTextIcon}
                title="Mensajes del bot"
                description="Respuestas puntuales para situaciones que no dependen del contenido del negocio."
              >
                <BotMessagesEditor
                  messages={settings.messages}
                  defaults={defaults}
                  limits={limits}
                  errors={errors}
                  onChange={(messages) => patchSettings({ messages })}
                />
              </SettingsSection>

              <SettingsSection
                id="ai-section-reply-delay"
                icon={TimerIcon}
                title="Tiempo de respuesta"
                description="Cuánto espera el asistente antes de enviar cada respuesta."
              >
                <ReplyDelayEditor
                  value={settings.replyDelay}
                  error={errors.replyDelay}
                  onChange={(replyDelay) => patchSettings({ replyDelay })}
                />
              </SettingsSection>

              <SettingsSection
                id="ai-section-advanced"
                icon={SlidersHorizontalIcon}
                title="Avanzado"
                description="Opciones técnicas del modelo. Cambiar el modelo puede romper las respuestas si el nombre no es válido."
              >
                <details className="group rounded-xl border border-border bg-sheet">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <span>Configuración del modelo</span>
                    <ChevronDownIcon
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="space-y-5 border-t border-border px-4 py-4">
                    <div className="rounded-md bg-warning-soft px-3 py-2.5 text-[12px] leading-5 text-warning-ink">
                      Cambiar el modelo puede romper las respuestas si el nombre no es válido. Si no
                      estás seguro, deja el campo vacío para usar el modelo del sistema.
                    </div>

                    <Field
                      id="model"
                      label="Modelo"
                      value={settings.model}
                      max={limits.short}
                      error={errors.model}
                      hint="Vacío = el modelo configurado por defecto en el sistema."
                    >
                      {(aria) => (
                        <Input
                          id="model"
                          value={settings.model}
                          onChange={(event) => patchSettings({ model: event.target.value })}
                          placeholder="Modelo del sistema"
                          autoComplete="off"
                          spellCheck={false}
                          {...aria}
                        />
                      )}
                    </Field>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Label htmlFor="temperature-default">Por defecto del proveedor</Label>
                          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                            Cuando está activo, no se envía una temperatura propia.
                          </p>
                        </div>
                        <Switch
                          id="temperature-default"
                          checked={settings.temperature === null}
                          onCheckedChange={(checked) =>
                            patchSettings({
                              temperature: checked ? null : DEFAULT_TEMPERATURE,
                            })
                          }
                          aria-describedby="temperature-default-hint"
                        />
                      </div>

                      <div className="rounded-lg border border-border bg-sheet p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label htmlFor="temperature">Temperatura</Label>
                          <output
                            htmlFor="temperature"
                            className="num text-[12px] font-medium text-foreground"
                          >
                            {settings.temperature === null
                              ? 'Por defecto del proveedor'
                              : settings.temperature.toFixed(2)}
                          </output>
                        </div>
                        <input
                          id="temperature"
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={settings.temperature ?? DEFAULT_TEMPERATURE}
                          onChange={(event) =>
                            patchSettings({ temperature: Number(event.target.value) })
                          }
                          disabled={settings.temperature === null || isBusy}
                          aria-describedby="temperature-hint"
                          className="mt-2 h-6 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p
                          id="temperature-hint"
                          className="mt-1 text-[11px] leading-4 text-muted-foreground"
                        >
                          0 = respuestas más predecibles · 1 = respuestas más creativas.
                        </p>
                        <span id="temperature-default-hint" className="sr-only">
                          Activa esta opción para enviar el valor nulo y usar el valor por defecto
                          del proveedor.
                        </span>
                      </div>
                    </div>

                    <Field
                      id="max-tokens"
                      label="Máximo de tokens"
                      value={settings.maxTokens === null ? '' : String(settings.maxTokens)}
                      error={errors.maxTokens}
                      hint={`Entre ${MAX_TOKENS_MIN} y ${MAX_TOKENS_MAX}. Vacío = se usa el valor por defecto del sistema.`}
                    >
                      {(aria) => (
                        <Input
                          id="max-tokens"
                          type="number"
                          inputMode="numeric"
                          min={MAX_TOKENS_MIN}
                          max={MAX_TOKENS_MAX}
                          step={1}
                          value={settings.maxTokens ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            if (raw === '') {
                              patchSettings({ maxTokens: null })
                              return
                            }
                            const parsed = Number(raw)
                            patchSettings({
                              maxTokens: Number.isFinite(parsed) ? parsed : null,
                            })
                          }}
                          placeholder="Por defecto del sistema"
                          {...aria}
                        />
                      )}
                    </Field>
                  </div>
                </details>
              </SettingsSection>

              <SettingsSection
                id="ai-section-reset"
                icon={RotateCcwIcon}
                tone="danger"
                title="Restablecer configuración"
                description="Vuelve a la configuración vacía del sistema. Es una acción destructiva y queda registrada como una versión nueva."
              >
                <p className="max-w-[460px] text-[13px] leading-5 text-muted-foreground">
                  Se perderán todos los textos, servicios, reglas y mensajes personalizados. Si
                  guardaste cambios antes, podrás recuperarlos desde el historial.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 border-destructive/40 bg-sheet text-destructive hover:bg-danger-soft hover:text-danger-ink"
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                  Restablecer a valores por defecto
                </Button>
              </SettingsSection>
            </div>
          </fieldset>
        </form>
      </div>

      {feedback?.kind === 'success' ? (
        <div
          role="status"
          className="flex items-start gap-2 border-t border-border bg-brote-soft px-4 py-2.5 text-[13px] leading-5 text-brote-ink sm:px-5"
        >
          <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {feedback?.kind === 'error' ? (
        <div className="border-t border-border px-4 py-2.5 sm:px-5">
          <div className="mx-auto w-full max-w-[1040px] space-y-2">
            <ErrorNotice message={feedback.message} details={feedback.details} />
            {feedback.retryable ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={retrySave}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="shrink-0 border-t border-border bg-sheet px-4 py-3 sm:px-5">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <span title={updatedAt ? formatDateTime(updatedAt) : undefined}>
              Versión <span className="num font-medium text-foreground">{version}</span>, guardada{' '}
              <span className="num">{relativeUpdatedAt}</span>
            </span>
            {isDirty ? <Badge variant="warning">Cambios sin guardar</Badge> : null}
            {errorCount > 0 ? (
              <span role="status" className="text-destructive">
                Hay {errorCount === 1 ? 'un campo' : `${errorCount} campos`} por corregir.
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={errorCount > 0 || isSaving}
              onClick={openPreview}
              aria-label="Ver prompt resultante"
            >
              <EyeIcon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ver prompt resultante</span>
              <span className="sm:hidden">Ver prompt</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryIcon className="size-3.5" aria-hidden="true" />
              Historial
            </Button>
            <Button
              type="submit"
              form="ai-settings-form"
              size="sm"
              disabled={!canSave}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <SaveIcon className="size-3.5" aria-hidden="true" />
              )}
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </footer>

      <PromptPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        prompt={previewSettings.data?.prompt ?? null}
        isPending={previewSettings.isPending}
        error={previewSettings.isError ? previewSettings.error : null}
        onRetry={retryPreview}
      />

      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        currentVersion={version}
        onRestored={(response) =>
          applyServerResponse(response, 'Versión restaurada correctamente.')
        }
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restablecer a valores por defecto"
        description="Se vaciará toda la configuración personalizada del asistente y se creará una versión nueva. Si necesitas el contenido anterior, podrás recuperarlo desde el historial."
        confirmLabel="Sí, restablecer"
        variant="destructive"
        isPending={resetSettings.isPending}
        onConfirm={() => resetSettings.mutate()}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset()
        }}
        title="Cambios sin guardar"
        description="Si sales ahora, perderás los cambios que aún no has guardado."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        variant="destructive"
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}
