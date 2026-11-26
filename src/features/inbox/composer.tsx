import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClockIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  LockIcon,
  SendIcon,
  ShieldOffIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, inboxApi } from '@/lib/api'
import { getErrorCode, getErrorMessage } from '@/lib/errors'
import { formatTime, formatWindowRemaining } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import type { ChatDetailResponse, ConversationMeta } from '@/types/api'

interface ComposerProps {
  chatId: string
  meta: ConversationMeta
  now: number
  onOpenTemplates: () => void
  onOpenDetails: () => void
}

export function Composer({
  chatId,
  meta,
  now,
  onOpenTemplates,
  onOpenDetails,
}: ComposerProps) {
  const queryClient = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')

  const windowOpen = meta.expiresAt ? meta.expiresAt > now : meta.windowOpen
  const canReply = meta.canReplyToService && windowOpen
  const optOutBlocked = meta.optOut && !canReply
  const canUseTemplate = !meta.optOut

  const reply = useMutation({
    mutationFn: (body: string) => inboxApi.reply(chatId, body),
    onSuccess: (response) => {
      setText('')
      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId), (current) =>
        current
          ? {
              ...current,
              status: response.status,
              meta: { ...current.meta, status: response.status },
            }
          : current,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      toast.success('Mensaje enviado')
      window.requestAnimationFrame(() => textareaRef.current?.focus())
    },
    onError: (error: Error) => {
      const code = getErrorCode(error)
      if (code === 'window_closed') {
        toast.error('La ventana de 24 h está cerrada')
        queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
        onOpenTemplates()
        return
      }
      if (code === 'opt_out') {
        toast.error('El contacto pidió no recibir mensajes')
        onOpenDetails()
        return
      }
      if (error instanceof ApiError && error.status === 401) return
      toast.error(getErrorMessage(error, 'No se pudo enviar el mensaje.'))
    },
  })

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = '0px'
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`
  }, [text])

  function sendMessage() {
    const body = text.trim()
    if (!body || !canReply || reply.isPending) return
    reply.mutate(body)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-sheet px-3 py-3 sm:px-4">
      {meta.optOut && canReply ? (
        <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-4 text-warning-ink">
          <ShieldOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          El contacto había pedido no recibir mensajes y volvió a escribir. Puedes responder a
          este mensaje, pero no iniciar envíos proactivos.
        </p>
      ) : null}

      <label htmlFor="composer" className="sr-only">
        Escribir respuesta
      </label>
      <Textarea
        ref={textareaRef}
        id="composer"
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          optOutBlocked
            ? 'El contacto pidió no recibir mensajes'
            : !windowOpen
              ? 'La ventana de 24 h está cerrada'
              : 'Escribe una respuesta…'
        }
        disabled={!canReply || reply.isPending}
        aria-describedby="composer-hint"
        className={cn('max-h-[132px] min-h-11 py-2.5', !canReply && 'bg-muted/60')}
      />

      <div
        id="composer-hint"
        className={cn(
          'mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
          !canReply && 'sm:flex-row',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {canReply && meta.expiresAt ? (
            <>
              <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {formatWindowRemaining(meta.expiresAt, now)} · cierra{' '}
                <span className="num">{formatTime(meta.expiresAt)}</span>
              </span>
            </>
          ) : optOutBlocked ? (
            <>
              <ShieldOffIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Solo puedes responder si el contacto vuelve a escribir.
              </span>
            </>
          ) : (
            <>
              <LockIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Usa una plantilla aprobada para volver a escribir.</span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-1.5 sm:justify-end">
          {optOutBlocked ? (
            <Button type="button" variant="ghost" size="sm" onClick={onOpenDetails}>
              Gestionar consentimiento
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenTemplates}
              disabled={!canUseTemplate || reply.isPending}
              title={
                !canUseTemplate
                  ? 'El contacto pidió no recibir mensajes'
                  : 'Enviar una plantilla aprobada por Meta'
              }
            >
              <LayoutTemplateIcon className="size-3.5" aria-hidden="true" />
              Usar plantilla
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={sendMessage}
            disabled={!canReply || !text.trim() || reply.isPending}
            aria-label="Enviar mensaje"
          >
            {reply.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <SendIcon className="size-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{reply.isPending ? 'Enviando…' : 'Enviar'}</span>
          </Button>
        </div>
      </div>

      {canReply ? (
        <p className="mt-1.5 hidden text-right text-[11px] text-muted-foreground sm:block">
          Enter para enviar · Shift + Enter para una línea nueva
        </p>
      ) : null}
    </div>
  )
}
