import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BotIcon,
  CalendarClockIcon,
  CopyIcon,
  EllipsisIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { QueryError } from '@/components/query-error'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/auth-context'
import type { ChatActions } from '@/features/inbox/chat-actions'
import {
  contactHandle,
  contactInitialSeed,
  contactName,
  plainSummary,
} from '@/features/inbox/inbox-utils'
import { chatsApi, inboxApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import {
  formatDate,
  formatDateTime,
  formatLeadStage,
  formatOptInSource,
  formatPhone,
  formatTime,
  formatWindowRemaining,
} from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { cn, copyToClipboard } from '@/lib/utils'
import type {
  ChatDetailResponse,
  ChatSummary,
  ConversationMeta,
  LeadStage,
} from '@/types/api'

const leadStages: LeadStage[] = [
  'nuevo',
  'en_diagnostico',
  'propuesto',
  'cliente',
  'perdido',
]

type ConsentKind = 'optIn' | 'optOut'
type MaintenanceKind = 'retention' | 'media'

interface ChatDetailsProps {
  chatId: string
  chat: ChatSummary | undefined
  detail: ChatDetailResponse | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  now: number
  actions: ChatActions
  onOpenTemplates: () => void
  inSheet?: boolean
}

function DetailsSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('px-4 py-4', className)}>
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'min-w-0 break-words text-right text-[12px] leading-4 font-medium text-foreground',
          mono && 'num',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function DetailsSkeleton() {
  return (
    <div className="space-y-5 px-4 py-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function ChatDetails({
  chatId,
  chat,
  detail,
  isLoading,
  isError,
  onRetry,
  now,
  actions,
  onOpenTemplates,
  inSheet = false,
}: ChatDetailsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [consentRequest, setConsentRequest] = useState<{
    kind: ConsentKind
    next: boolean
  } | null>(null)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [maintenanceKind, setMaintenanceKind] = useState<MaintenanceKind | null>(null)

  const meta: ConversationMeta | undefined = detail?.meta
  const status = detail?.status ?? chat?.status ?? 'bot'
  const name = chat ? contactName(chat) : chatId
  const windowOpenNow = meta ? (meta.expiresAt ? meta.expiresAt > now : meta.windowOpen) : false
  const leadStage = meta?.leadStage ?? chat?.lead_stage ?? 'nuevo'

  const deleteChat = useMutation({
    mutationFn: () => chatsApi.remove(chatId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.chat(chatId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      toast.success('Chat eliminado')
      navigate('/inbox')
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el chat.'))
    },
  })

  const maintenance = useMutation({
    mutationFn: (kind: MaintenanceKind) =>
      kind === 'retention' ? inboxApi.runRetention() : inboxApi.cleanupMedia(),
    onSuccess: (response, kind) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
      setMaintenanceKind(null)
      if (kind === 'retention') {
        if (response.result?.skipped === 'disabled') {
          toast.success('La retención está desactivada')
        } else {
          toast.success('Retención ejecutada', {
            description: `${response.result?.deletedChats ?? 0} chats, ${
              response.result?.deletedContacts ?? 0
            } contactos y ${response.result?.deletedMedia ?? 0} archivos eliminados.`,
          })
        }
      } else {
        toast.success('Limpieza de media completada', {
          description: `${response.result?.deleted ?? 0} archivos eliminados de ${
            response.result?.scanned ?? 0
          } revisados.`,
        })
      }
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo ejecutar la tarea.'))
    },
  })

  function copyValue(value: string, label: string) {
    void copyToClipboard(value)
      .then(() => toast.success(`${label} copiado`))
      .catch(() => toast.error('No se pudo copiar'))
  }

  function requestConsent(kind: ConsentKind, next: boolean) {
    setConsentRequest({ kind, next })
  }

  async function confirmConsent() {
    if (!consentRequest) return
    const { kind, next } = consentRequest
    try {
      await actions.optIn.mutateAsync({ [kind]: next })
      toast.success(
        kind === 'optIn'
          ? next
            ? 'Opt-in registrado'
            : 'Opt-in retirado'
          : next
            ? 'Opt-out registrado'
            : 'Opt-out retirado',
      )
      setConsentRequest(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el consentimiento.'))
    }
  }

  async function changeStage(value: string) {
    try {
      await actions.stage.mutateAsync(value as LeadStage)
      toast.success(`Etapa actualizada: ${formatLeadStage(value as LeadStage)}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cambiar la etapa.'))
    }
  }

  function runHandoff(action: 'pause' | 'resume') {
    void actions.handoff
      .mutateAsync(action)
      .then(() => {
        toast.success(action === 'pause' ? 'Bot pausado' : 'Bot retomado')
        setResumeOpen(false)
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, 'No se pudo cambiar el estado del bot.'))
      })
  }

  function confirmDeleteChat() {
    deleteChat.mutate()
  }

  function confirmMaintenance() {
    if (maintenanceKind) maintenance.mutate(maintenanceKind)
  }

  const consentDescription = (() => {
    if (!consentRequest) return null
    if (consentRequest.kind === 'optIn') {
      return consentRequest.next
        ? `Registrarás el consentimiento explícito de ${name}. La fecha y el origen quedarán guardados.`
        : 'Se borrará la evidencia de opt-in. Sin opt-in no podrás enviar plantillas de marketing.'
    }
    return consentRequest.next
      ? `Registrarás que ${name} no quiere recibir mensajes. Esto reemplaza cualquier opt-in y bloquea los envíos proactivos.`
      : 'Se retirará el opt-out registrado. Solo vuelve a enviar mensajes si el contacto vuelve a dar su consentimiento.'
  })()

  const consentTitle = (() => {
    if (!consentRequest) return 'Consentimiento'
    if (consentRequest.kind === 'optIn') {
      return consentRequest.next ? 'Registrar opt-in' : 'Retirar opt-in'
    }
    return consentRequest.next ? 'Registrar opt-out' : 'Retirar opt-out'
  })()

  return (
    <div className="flex h-full min-h-0 flex-col bg-sheet">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center justify-between border-b border-border pl-4',
          inSheet ? 'pr-12' : 'pr-2',
        )}
      >
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Detalle</h2>
          <span className="text-[11px] text-muted-foreground">Contacto</span>
        </div>
        {isAdmin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Abrir mantenimiento administrativo">
                <EllipsisIcon className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mantenimiento</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setMaintenanceKind('retention')}>
                <CalendarClockIcon aria-hidden="true" />
                Ejecutar retención
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMaintenanceKind('media')}>
                <RefreshCwIcon aria-hidden="true" />
                Limpiar media huérfana
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && !detail ? <DetailsSkeleton /> : null}

        {isError && !detail ? (
          <QueryError
            title="No se pudo cargar el contacto"
            description="Vuelve a intentarlo para consultar su consentimiento y su etapa."
            onRetry={onRetry}
            compact
          />
        ) : null}

        {detail ? (
          <>
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={chat?.name ?? chat?.phone ?? chatId}
                  email={chat ? contactInitialSeed(chat) : chatId}
                  size="lg"
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-[14px] leading-5 font-semibold">{name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {chat?.phone ? formatPhone(chat.phone) : chat ? contactHandle(chat) : chatId}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <Badge variant={status === 'humano' ? 'human' : 'bot'}>
                      {status === 'humano' ? 'Humano' : 'Bot'}
                    </Badge>
                    <Badge variant={windowOpenNow ? 'open' : 'neutral'}>
                      {windowOpenNow ? 'Ventana abierta' : 'Ventana cerrada'}
                    </Badge>
                  </div>
                </div>
              </div>

              {chat?.summary ? (
                <div className="mt-3 rounded-lg bg-raised p-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Resumen de la conversación
                  </p>
                  <p className="mt-1 line-clamp-5 text-[12px] leading-5 whitespace-pre-line text-foreground">
                    {plainSummary(chat.summary)}
                  </p>
                </div>
              ) : null}
            </div>

            <DetailsSection title="Contacto">
              <dl className="divide-y divide-border/60">
                <DataRow
                  label="Teléfono"
                  value={
                    chat?.phone ? (
                      <span className="inline-flex items-center gap-1">
                        {formatPhone(chat.phone)}
                        <button
                          type="button"
                          onClick={() => copyValue(chat.phone ?? '', 'Teléfono')}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label="Copiar teléfono"
                        >
                          <CopyIcon className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No registrado</span>
                    )
                  }
                />
                <DataRow
                  label={chat?.phone ? 'ID de WhatsApp' : 'BSUID'}
                  value={
                    <span className="inline-flex items-center gap-1">
                      <span className="num break-all">{chatId}</span>
                      <button
                        type="button"
                        onClick={() => copyValue(chatId, 'ID')}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label="Copiar identificador"
                      >
                        <CopyIcon className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  }
                  mono
                />
                {chat?.username ? (
                  <DataRow label="Usuario" value={`@${chat.username}`} />
                ) : null}
                <DataRow label="Última actividad" value={formatDateTime(chat?.last_seen_at)} />
              </dl>
            </DetailsSection>

            <DetailsSection
              title="Ventana de servicio"
              description="WhatsApp permite responder libremente durante 24 h desde el último mensaje del contacto."
            >
              <div className="rounded-lg border border-border bg-sheet p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[12px] font-medium',
                      windowOpenNow ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        windowOpenNow ? 'bg-primary' : 'bg-muted-foreground/50',
                      )}
                      aria-hidden="true"
                    />
                    {windowOpenNow ? 'Abierta' : 'Cerrada'}
                  </span>
                  <span className="num text-[11px] text-muted-foreground">
                    {meta?.expiresAt && windowOpenNow
                      ? formatWindowRemaining(meta.expiresAt, now)
                      : 'Sin respuesta libre'}
                  </span>
                </div>
                <dl className="mt-2.5 divide-y divide-border/60">
                  <DataRow
                    label="Último mensaje recibido"
                    value={meta?.lastInboundAt ? formatDateTime(meta.lastInboundAt) : '—'}
                  />
                  <DataRow
                    label="Vence"
                    value={meta?.expiresAt ? formatDateTime(meta.expiresAt) : '—'}
                  />
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={onOpenTemplates}
                  disabled={meta?.optOut}
                  title={
                    meta?.optOut
                      ? 'El contacto pidió no recibir mensajes'
                      : 'Enviar una plantilla aprobada por Meta'
                  }
                >
                  <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
                  Usar plantilla
                </Button>
              </div>
            </DetailsSection>

            <DetailsSection
              title="Consentimiento"
              description="Cada cambio queda registrado con fecha y origen."
              className="border-t border-border"
            >
              <div id="contact-consent" className="rounded-lg border border-border bg-raised p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium">Opt-in</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                      {meta?.optInAt
                        ? `${formatDate(meta.optInAt)} · ${formatTime(meta.optInAt)}`
                        : 'Sin evidencia registrada'}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                      {formatOptInSource(meta?.optInSource ?? null)}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(meta?.optIn)}
                    onCheckedChange={(checked) => requestConsent('optIn', checked)}
                    disabled={actions.optIn.isPending}
                    aria-label="Registrar opt-in"
                  />
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium">Opt-out</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                      {meta?.optOutAt
                        ? `${formatDate(meta.optOutAt)} · ${formatTime(meta.optOutAt)}`
                        : 'Sin evidencia registrada'}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                      {formatOptInSource(meta?.optOutSource ?? null)}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(meta?.optOut)}
                    onCheckedChange={(checked) => requestConsent('optOut', checked)}
                    disabled={actions.optIn.isPending}
                    aria-label="Registrar opt-out"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex items-start gap-2 text-[11px] leading-4 text-muted-foreground">
                <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {meta?.canSendProactive
                    ? 'El contacto tiene consentimiento para envíos proactivos.'
                    : 'Sin opt-in explícito no se pueden iniciar envíos proactivos.'}
                </span>
              </div>
            </DetailsSection>

            <DetailsSection
              title="Seguimiento"
              description="Estado del embudo y control del bot."
              className="border-t border-border"
            >
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="lead-stage"
                    className="mb-1.5 block text-[11px] font-medium text-muted-foreground"
                  >
                    Etapa del lead
                  </label>
                  <Select
                    value={leadStage}
                    onValueChange={changeStage}
                    disabled={actions.stage.isPending}
                  >
                    <SelectTrigger id="lead-stage" aria-label="Etapa del lead">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {formatLeadStage(stage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <BotIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="text-[12px] font-medium">Bot</p>
                      <p className="text-[11px] text-muted-foreground">
                        {status === 'humano' ? 'Pausado' : 'Respondiendo'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (status === 'humano') setResumeOpen(true)
                      else runHandoff('pause')
                    }}
                    disabled={actions.handoff.isPending}
                  >
                    {actions.handoff.isPending ? (
                      <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />
                    ) : status === 'humano' ? (
                      <PlayIcon className="size-3" aria-hidden="true" />
                    ) : (
                      <PauseIcon className="size-3" aria-hidden="true" />
                    )}
                    {status === 'humano' ? 'Retomar' : 'Pausar'}
                  </Button>
                </div>

                <dl className="divide-y divide-border/60">
                  <DataRow
                    label="Seguimiento enviado"
                    value={
                      meta?.followupSentAt
                        ? formatDateTime(meta.followupSentAt)
                        : 'Aún no se ha enviado'
                    }
                  />
                </dl>
              </div>
            </DetailsSection>

            {isAdmin ? (
              <section className="border-t border-border px-4 pt-4 pb-5">
                <h3 className="text-[13px] font-semibold text-foreground">Administración</h3>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  El borrado es definitivo. También se elimina la media que ya no esté
                  referenciada.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto px-0 py-1 text-destructive hover:bg-transparent hover:underline"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="size-3.5" aria-hidden="true" />
                  Eliminar conversación
                </Button>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(consentRequest)}
        onOpenChange={(open) => {
          if (!open) setConsentRequest(null)
        }}
        title={consentTitle}
        description={consentDescription}
        confirmLabel={consentTitle}
        variant={
          consentRequest?.kind === 'optOut' && consentRequest.next ? 'destructive' : 'default'
        }
        isPending={actions.optIn.isPending}
        onConfirm={() => void confirmConsent()}
      />

      <ConfirmDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        title="Retomar el bot"
        description="El bot volverá a responder. Si la ventana de 24 h sigue abierta, se enviará un aviso al cliente."
        confirmLabel="Retomar bot"
        isPending={actions.handoff.isPending}
        onConfirm={() => runHandoff('resume')}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar conversación"
        description={
          <>
            Se eliminará la conversación con{' '}
            <span className="font-medium text-foreground">{name}</span>, todos sus mensajes y la
            media que ya no use otro chat. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar conversación"
        variant="destructive"
        isPending={deleteChat.isPending}
        onConfirm={confirmDeleteChat}
      />

      <ConfirmDialog
        open={Boolean(maintenanceKind)}
        onOpenChange={(open) => {
          if (!open) setMaintenanceKind(null)
        }}
        title={maintenanceKind === 'retention' ? 'Ejecutar retención' : 'Limpiar media huérfana'}
        description={
          maintenanceKind === 'retention'
            ? 'Se eliminarán las conversaciones y contactos inactivos según la retención configurada. La media no referenciada también se borrará.'
            : 'Se eliminarán del almacenamiento los archivos huérfanos que superen el período de gracia. La media referenciada no se toca.'
        }
        confirmLabel={maintenanceKind === 'retention' ? 'Ejecutar retención' : 'Limpiar media'}
        variant="destructive"
        isPending={maintenance.isPending}
        onConfirm={confirmMaintenance}
      />

      {deleteChat.isPending ? (
        <span className="sr-only" role="status">
          Eliminando conversación
        </span>
      ) : null}
      {maintenance.isPending ? (
        <span className="sr-only" role="status">
          Ejecutando mantenimiento
        </span>
      ) : null}
    </div>
  )
}
