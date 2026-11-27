import { InboxIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/auth-context'
import { useChatActions } from '@/features/inbox/chat-actions'
import { ChatDetails } from '@/features/inbox/chat-details'
import { ChatListPane } from '@/features/inbox/chat-list-pane'
import { ChatThreadPane } from '@/features/inbox/chat-thread-pane'
import { summarizeChats } from '@/features/inbox/inbox-utils'
import { useChatQuery, useChatsQuery } from '@/features/inbox/queries'
import { TemplatesDialog } from '@/features/inbox/templates-dialog'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/use-now'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

function InboxTitleRow({
  total,
  waiting,
  closedWindows,
  isLoading,
  isFetching,
  updatedAt,
  onRefresh,
}: {
  total: number
  waiting: number
  closedWindows: number
  isLoading: boolean
  isFetching: boolean
  updatedAt: number | null
  onRefresh: () => void
}) {
  return (
    <div className="flex min-h-[62px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-[23px] leading-none font-semibold tracking-[-0.04em]">
            Bandeja
          </h1>
          {!isLoading ? (
            <span className="num rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {total}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[12px] leading-4 text-muted-foreground">
          {isLoading
            ? 'Cargando conversaciones…'
            : `${waiting} por responder · ${closedWindows} con ventana cerrada`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {updatedAt ? (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Actualizado <span className="num">{formatTime(updatedAt)}</span>
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRefresh}
          aria-label="Actualizar la bandeja"
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}

function EmptyThread() {
  return (
    <EmptyState
      icon={InboxIcon}
      title="Elige una conversación"
      description="El hilo, el consentimiento y la etapa del contacto aparecerán aquí. Busca por nombre, teléfono o mensaje en la columna de la izquierda."
      className="h-full"
    />
  )
}

export function InboxPage() {
  const { chatId } = useParams<{ chatId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const chatsQuery = useChatsQuery()
  const chatQuery = useChatQuery(chatId)
  const actions = useChatActions(chatId)
  const now = useNow(30_000)
  const isWideDetails = useMediaQuery('(min-width: 1360px)')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const chats = chatsQuery.data
  const chat = useMemo(() => chats?.find((item) => item.user_id === chatId), [chatId, chats])
  const summary = useMemo(() => summarizeChats(chats ?? []), [chats])
  const isAdmin = user?.role === 'admin'
  const detail = chatQuery.data

  useDocumentTitle(chat ? `Bandeja · ${chat.name ?? chat.phone ?? chatId}` : 'Bandeja')

  function refreshAll() {
    void chatsQuery.refetch()
    if (chatId) void chatQuery.refetch()
  }

  function openDetails() {
    setDetailsOpen(true)
  }

  function scrollToConsent() {
    document.getElementById('contact-consent')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  function requestOptIn() {
    if (isWideDetails) {
      scrollToConsent()
      return
    }
    setDetailsOpen(true)
    window.setTimeout(scrollToConsent, 220)
  }

  const chatPaneVisible = Boolean(chatId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InboxTitleRow
        total={summary.total}
        waiting={summary.waiting}
        closedWindows={summary.closedWindows}
        isLoading={chatsQuery.isLoading}
        isFetching={chatsQuery.isFetching || chatQuery.isFetching}
        updatedAt={chatsQuery.dataUpdatedAt || null}
        onRefresh={refreshAll}
      />

      <div className="flex min-h-0 flex-1">
        <ChatListPane
          chats={chats}
          isLoading={chatsQuery.isLoading}
          isError={chatsQuery.isError}
          error={chatsQuery.error}
          onRetry={() => void chatsQuery.refetch()}
          selectedId={chatId}
          className={cn(
            'w-full shrink-0 md:w-[318px] lg:w-[344px] xl:w-[358px]',
            chatPaneVisible ? 'hidden md:flex' : 'flex',
          )}
        />

        <div
          className={cn(
            'min-h-0 min-w-0 flex-1',
            chatPaneVisible ? 'flex flex-col' : 'hidden md:flex md:flex-col',
          )}
        >
          {chatId ? (
            <ChatThreadPane
              key={chatId}
              chatId={chatId}
              chat={chat}
              detail={detail}
              isLoading={chatQuery.isLoading}
              isError={chatQuery.isError}
              error={chatQuery.error}
              onRetry={() => void chatQuery.refetch()}
              now={now}
              actions={actions}
              isAdmin={isAdmin}
              onBack={() => navigate('/inbox')}
              onOpenDetails={openDetails}
              onOpenTemplates={() => setTemplatesOpen(true)}
            />
          ) : (
            <EmptyThread />
          )}
        </div>

        {chatId && isWideDetails ? (
          <div className="h-full w-[312px] shrink-0 border-l border-border">
            <ChatDetails
              key={chatId}
              chatId={chatId}
              chat={chat}
              detail={detail}
              isLoading={chatQuery.isLoading}
              isError={chatQuery.isError}
              error={chatQuery.error}
              onRetry={() => void chatQuery.refetch()}
              now={now}
              actions={actions}
              onOpenTemplates={() => setTemplatesOpen(true)}
            />
          </div>
        ) : null}
      </div>

      {chatId && !isWideDetails ? (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="right" className="w-[min(390px,calc(100vw-24px))] p-0">
            <SheetTitle className="sr-only">Detalle del contacto</SheetTitle>
            <SheetDescription className="sr-only">
              Datos del contacto, ventana de servicio, consentimiento y seguimiento.
            </SheetDescription>
            <ChatDetails
              key={chatId}
              chatId={chatId}
              chat={chat}
              detail={detail}
              isLoading={chatQuery.isLoading}
              isError={chatQuery.isError}
              error={chatQuery.error}
              onRetry={() => void chatQuery.refetch()}
              now={now}
              actions={actions}
              onOpenTemplates={() => {
                setDetailsOpen(false)
                setTemplatesOpen(true)
              }}
              inSheet
            />
          </SheetContent>
        </Sheet>
      ) : null}

      {chatId && detail && templatesOpen ? (
        <TemplatesDialog
          open
          onOpenChange={setTemplatesOpen}
          chatId={chatId}
          chatName={chat?.name ?? chat?.phone ?? chatId}
          meta={detail.meta}
          now={now}
          onRequestOptIn={requestOptIn}
        />
      ) : null}
    </div>
  )
}
