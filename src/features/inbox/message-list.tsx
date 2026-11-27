import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownIcon, MessageSquareIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageBubble } from '@/features/inbox/message-bubble'
import { messagesApi } from '@/lib/api'
import { getErrorMessage, isForbiddenError } from '@/lib/errors'
import { bogotaDayKey, formatDayDivider, formatTime } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import type { ThreadMessage } from '@/types/api'

interface MessageListProps {
  chatId: string
  chatName: string
  messages: ThreadMessage[] | undefined
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry: () => void
  isAdmin: boolean
  now: number
}

interface MessageGroup {
  key: string
  messages: ThreadMessage[]
}

function groupByDay(messages: ThreadMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const message of messages) {
    const key = bogotaDayKey(message.created_at)
    const current = groups[groups.length - 1]
    if (current?.key === key) {
      current.messages.push(message)
    } else {
      groups.push({ key, messages: [message] })
    }
  }
  return groups
}

function MessageListSkeleton() {
  return (
    <div className="space-y-3 px-3 py-4 sm:px-5" aria-hidden="true">
      <div className="mx-auto h-5 w-20 rounded-full bg-muted" />
      <div className="flex justify-start">
        <Skeleton className="h-16 w-[58%] max-w-[360px] rounded-xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-[44%] max-w-[300px] rounded-xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-24 w-[66%] max-w-[400px] rounded-xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[36%] max-w-[260px] rounded-xl" />
      </div>
    </div>
  )
}

export function MessageList({
  chatId,
  chatName,
  messages,
  isLoading,
  isError,
  error,
  onRetry,
  isAdmin,
  now,
}: MessageListProps) {
  const queryClient = useQueryClient()
  const forbidden = isForbiddenError(error)
  const scrollRef = useRef<HTMLDivElement>(null)
  const renderedRef = useRef<{ chatId: string; lastId: string | null; count: number }>({
    chatId: '',
    lastId: null,
    count: 0,
  })
  const announcedInboundRef = useRef<string | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [messageToDelete, setMessageToDelete] = useState<ThreadMessage | null>(null)

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => messagesApi.remove(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      toast.success('Mensaje eliminado')
      setMessageToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el mensaje.'))
    },
  })

  const groups = useMemo(() => groupByDay(messages ?? []), [messages])

  const lastInbound = useMemo(() => {
    for (let index = (messages?.length ?? 0) - 1; index >= 0; index -= 1) {
      const message = messages?.[index]
      if (message?.direction === 'in') return message
    }
    return undefined
  }, [messages])

  useEffect(() => {
    if (!lastInbound) return
    if (announcedInboundRef.current === lastInbound.id) return
    const wasInitialized = announcedInboundRef.current !== null
    announcedInboundRef.current = lastInbound.id
    if (!wasInitialized) return
    const preview = lastInbound.body.trim().slice(0, 120)
    setAnnouncement(`Nuevo mensaje de ${chatName}${preview ? `: ${preview}` : ''}`)
  }, [chatName, lastInbound])

  useEffect(() => {
    const latest = messages?.[messages.length - 1]
    if (!latest) return

    const previous = renderedRef.current
    const isNewChat = previous.chatId !== chatId
    const isNewMessage = previous.lastId !== latest.id

    if (isNewChat) {
      setIsAtBottom(true)
      window.requestAnimationFrame(() => {
        const node = scrollRef.current
        if (node) node.scrollTop = node.scrollHeight
      })
    } else if (isNewMessage && (isAtBottom || latest.direction === 'out')) {
      window.requestAnimationFrame(() => {
        const node = scrollRef.current
        if (node) {
          const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          node.scrollTo({ top: node.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
        }
      })
    }

    renderedRef.current = { chatId, lastId: latest.id, count: messages?.length ?? 0 }
  }, [chatId, isAtBottom, messages])

  function handleScroll() {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    setIsAtBottom(distance < 96)
  }

  function scrollToBottom() {
    const node = scrollRef.current
    if (!node) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    node.scrollTo({ top: node.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }

  function confirmDelete() {
    if (!messageToDelete) return
    deleteMessage.mutate(messageToDelete.id)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-thread">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        role="region"
        aria-label={`Mensajes con ${chatName}`}
        tabIndex={0}
      >
        {isLoading ? <MessageListSkeleton /> : null}

        {isError && !isLoading ? (
          <QueryError
            title={
              forbidden
                ? 'No tienes permiso para ver esta conversación'
                : 'No se pudo cargar la conversación'
            }
            description={
              forbidden
                ? 'Pídele a un administrador que revise tus permisos.'
                : 'El hilo no está disponible en este momento.'
            }
            onRetry={forbidden ? undefined : onRetry}
            compact
          />
        ) : null}

        {!isLoading && !isError && messages?.length === 0 ? (
          <EmptyState
            icon={MessageSquareIcon}
            title="Todavía no hay mensajes"
            description="Los mensajes de esta conversación aparecerán aquí."
            compact
          />
        ) : null}

        {!isLoading && !isError && messages?.length ? (
          <div className="px-3 py-4 sm:px-5">
            {groups.map((group) => (
              <div key={group.key} className="mb-1">
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full bg-sheet/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {formatDayDivider(group.messages[0]?.created_at ?? now, now)}
                  </span>
                </div>
                <div className="space-y-2" role="list">
                  {group.messages.map((message) => (
                    <div key={message.id} role="listitem">
                      <MessageBubble
                        message={message}
                        isAdmin={isAdmin}
                        onRequestDelete={setMessageToDelete}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="h-1" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {!isAtBottom && messages?.length ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-auto h-8 rounded-full bg-sheet"
            onClick={scrollToBottom}
          >
            <ArrowDownIcon className="size-3.5" aria-hidden="true" />
            Ir al final
          </Button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <ConfirmDialog
        open={Boolean(messageToDelete)}
        onOpenChange={(open) => {
          if (!open) setMessageToDelete(null)
        }}
        title="Eliminar mensaje"
        description={
          <>
            Se eliminará el mensaje{' '}
            <span className="font-medium text-foreground">
              de las {formatTime(messageToDelete?.created_at)}
            </span>{' '}
            de esta conversación. La media asociada también se borrará si ningún otro mensaje la
            usa.
          </>
        }
        confirmLabel="Eliminar mensaje"
        variant="destructive"
        isPending={deleteMessage.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
