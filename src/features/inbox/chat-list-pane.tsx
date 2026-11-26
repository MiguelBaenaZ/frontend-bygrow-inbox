import { InboxIcon, SearchIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { QueryError } from '@/components/query-error'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  chatFilters,
  contactInitialSeed,
  contactName,
  filterChats,
  lastMessagePreview,
  type ChatFilter,
} from '@/features/inbox/inbox-utils'
import { cn } from '@/lib/utils'
import {
  formatConversationStatus,
  formatDateTime,
  formatInboxStamp,
} from '@/lib/format'
import { useNow } from '@/hooks/use-now'
import type { ChatSummary } from '@/types/api'

interface ChatListPaneProps {
  chats: ChatSummary[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  selectedId: string | undefined
  className?: string
}

function ChatRow({
  chat,
  selected,
  now,
}: {
  chat: ChatSummary
  selected: boolean
  now: number
}) {
  const name = contactName(chat)
  const time = chat.updated_at ?? chat.last_seen_at
  const needsReply = chat.last_dir === 'in'

  return (
    <Link
      to={`/inbox/${encodeURIComponent(chat.user_id)}`}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-[78px] gap-3 border-b border-rule px-3.5 py-3 transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none',
        selected ? 'bg-active' : 'hover:bg-muted/65',
      )}
    >
      <UserAvatar
        name={chat.name ?? chat.phone ?? chat.user_id}
        email={contactInitialSeed(chat)}
        size="md"
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[13px] text-foreground',
              selected || needsReply ? 'font-semibold' : 'font-medium',
            )}
          >
            {name}
          </p>
          <span
            className="shrink-0 text-[11px] text-muted-foreground"
            title={formatDateTime(time)}
          >
            {formatInboxStamp(time, now)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[12px] leading-4 text-muted-foreground">
            {lastMessagePreview(chat)}
          </p>
          {needsReply ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              title="El último mensaje es del contacto"
              aria-label="El último mensaje es del contacto"
            />
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {chat.status ? (
            <Badge variant={chat.status === 'humano' ? 'human' : 'bot'}>
              {formatConversationStatus(chat.status)}
            </Badge>
          ) : null}
          {!chat.window_open ? <Badge variant="warning">Ventana cerrada</Badge> : null}
          {chat.opt_out ? <Badge variant="danger">Opt-out</Badge> : null}
        </div>
      </div>
    </Link>
  )
}

function ChatListSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[78px] gap-3 border-b border-rule px-3.5 py-3"
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex justify-between gap-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-2.5 w-full max-w-[190px]" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatListPane({
  chats,
  isLoading,
  isError,
  onRetry,
  selectedId,
  className,
}: ChatListPaneProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ChatFilter>('all')
  const now = useNow(30_000)

  const filteredChats = useMemo(
    () => (chats ? filterChats(chats, filter, search) : []),
    [chats, filter, search],
  )

  const hasChats = Boolean(chats?.length)
  const hasFilters = Boolean(search.trim()) || filter !== 'all'

  return (
    <section
      className={cn('h-full min-h-0 flex-col border-r border-border bg-sheet', className)}
      aria-label="Conversaciones"
    >
      <div className="shrink-0 border-b border-border px-3.5 pt-3 pb-2.5">
        <div className="relative">
          <label htmlFor="chat-search" className="sr-only">
            Buscar conversaciones
          </label>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="chat-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, teléfono o mensaje"
            className="h-8 pr-8 pl-8 text-[13px]"
            autoComplete="off"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Limpiar búsqueda"
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div
          className="mt-2 flex flex-wrap gap-1"
          role="group"
          aria-label="Filtrar conversaciones"
        >
          {chatFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                filter === item.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-sheet text-muted-foreground hover:border-control hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? <ChatListSkeleton /> : null}

        {isError && !isLoading ? (
          <QueryError
            title="No se pudieron cargar las conversaciones"
            onRetry={onRetry}
            compact
          />
        ) : null}

        {!isLoading && !isError && !hasChats ? (
          <EmptyState
            icon={InboxIcon}
            title="No hay conversaciones todavía"
            description="Cuando un contacto escriba por WhatsApp, aparecerá aquí."
          />
        ) : null}

        {!isLoading && !isError && hasChats && filteredChats.length === 0 ? (
          <EmptyState
            title="No encontramos conversaciones"
            description="Prueba con otro término o cambia el filtro."
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : null
            }
            compact
          />
        ) : null}

        {!isLoading && !isError
          ? filteredChats.map((chat) => (
              <ChatRow
                key={chat.user_id}
                chat={chat}
                selected={chat.user_id === selectedId}
                now={now}
              />
            ))
          : null}
      </div>
    </section>
  )
}
