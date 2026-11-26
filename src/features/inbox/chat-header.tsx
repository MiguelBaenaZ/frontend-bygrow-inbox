import {
  ArrowLeftIcon,
  Loader2Icon,
  PanelRightOpenIcon,
  PauseIcon,
  PlayIcon,
  TimerIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ChatActions } from '@/features/inbox/chat-actions'
import { contactHandle, contactInitialSeed, contactName } from '@/features/inbox/inbox-utils'
import { getErrorCode, getErrorMessage } from '@/lib/errors'
import {
  formatConversationStatus,
  formatDateTime,
  formatPhone,
  formatWindowRemaining,
  windowProgress,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatDetailResponse, ChatSummary } from '@/types/api'

interface ChatHeaderProps {
  chatId: string
  chat: ChatSummary | undefined
  detail: ChatDetailResponse | undefined
  now: number
  actions: ChatActions
  onBack: () => void
  onOpenDetails: () => void
}

export function ChatHeader({
  chatId,
  chat,
  detail,
  now,
  actions,
  onBack,
  onOpenDetails,
}: ChatHeaderProps) {
  const [resumeOpen, setResumeOpen] = useState(false)
  const name = chat ? contactName(chat) : chatId
  const status = detail?.status ?? chat?.status ?? 'bot'
  const meta = detail?.meta
  const windowOpen = meta ? (meta.expiresAt ? meta.expiresAt > now : meta.windowOpen) : false
  const progress = meta
    ? windowProgress(meta.lastInboundAt, meta.expiresAt, now)
    : 0
  const handoffPending = actions.handoff.isPending

  function runHandoff(action: 'pause' | 'resume') {
    void actions.handoff
      .mutateAsync(action)
      .then(() => {
        toast.success(action === 'pause' ? 'Bot pausado' : 'Bot retomado')
        setResumeOpen(false)
      })
      .catch((error: unknown) => {
        if (getErrorCode(error) === 'window_closed') {
          toast.error('La ventana de 24 h está cerrada')
        } else {
          toast.error(getErrorMessage(error))
        }
      })
  }

  return (
    <>
      <header className="shrink-0 border-b border-border bg-sheet">
        <div className="flex min-h-[64px] items-center gap-2.5 px-3 py-2.5 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="md:hidden"
            aria-label="Volver a la lista de conversaciones"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </Button>

          <UserAvatar
            name={chat?.name ?? chat?.phone ?? chatId}
            email={chat ? contactInitialSeed(chat) : chatId}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[14px] leading-5 font-semibold text-foreground">
                {name}
              </h2>
              <Badge variant={status === 'humano' ? 'human' : 'bot'} className="hidden sm:inline-flex">
                {formatConversationStatus(status)}
              </Badge>
            </div>
            <p className="truncate text-[11px] leading-4 text-muted-foreground">
              {chat?.phone ? formatPhone(chat.phone) : chat ? contactHandle(chat) : chatId}
              {chat?.username && chat.phone ? ` · @${chat.username}` : ''}
            </p>
          </div>

          {meta?.expiresAt ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'hidden h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium lg:inline-flex',
                    windowOpen
                      ? progress < 20
                        ? 'border-warning/30 bg-warning-soft text-warning-ink'
                        : 'border-brote/60 bg-brote-soft text-brote-ink'
                      : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  <TimerIcon className="size-3" aria-hidden="true" />
                  <span className="num">
                    {windowOpen ? formatWindowRemaining(meta.expiresAt, now) : 'Ventana cerrada'}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {meta.expiresAt
                  ? `La ventana de servicio cierra ${formatDateTime(meta.expiresAt)}`
                  : 'Sin ventana de servicio activa'}
              </TooltipContent>
            </Tooltip>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => {
              if (status === 'humano') setResumeOpen(true)
              else runHandoff('pause')
            }}
            disabled={!detail || handoffPending}
            aria-label={status === 'humano' ? 'Retomar el bot' : 'Pausar el bot'}
          >
            {handoffPending ? (
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
            ) : status === 'humano' ? (
              <PlayIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <PauseIcon className="size-3.5" aria-hidden="true" />
            )}
            <span>{status === 'humano' ? 'Retomar bot' : 'Pausar bot'}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => {
              if (status === 'humano') setResumeOpen(true)
              else runHandoff('pause')
            }}
            disabled={!detail || handoffPending}
            aria-label={
              status === 'humano'
                ? 'Retomar el bot. Si la ventana está abierta, el cliente recibirá un aviso.'
                : 'Pausar el bot'
            }
          >
            {status === 'humano' ? (
              <PlayIcon className="size-4" aria-hidden="true" />
            ) : (
              <PauseIcon className="size-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenDetails}
            className="min-[1360px]:hidden"
            aria-label="Abrir detalles del contacto"
          >
            <PanelRightOpenIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="h-0.5 w-full overflow-hidden bg-border/60" aria-hidden="true">
          <div
            className={cn('h-full', windowOpen ? 'bg-primary' : 'bg-transparent')}
            style={{ width: windowOpen ? `${Math.max(2, progress)}%` : '0%' }}
          />
        </div>
      </header>

      <ConfirmDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        title="Retomar el bot"
        description={
          <>
            El bot volverá a responder automáticamente en esta conversación. Si la ventana de 24
            h sigue abierta, también se enviará un aviso al cliente.
          </>
        }
        confirmLabel="Retomar bot"
        isPending={handoffPending}
        onConfirm={() => runHandoff('resume')}
      />
    </>
  )
}
