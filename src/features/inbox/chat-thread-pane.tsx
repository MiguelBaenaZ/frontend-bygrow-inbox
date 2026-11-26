import { Skeleton } from '@/components/ui/skeleton'
import type { ChatActions } from '@/features/inbox/chat-actions'
import { ChatHeader } from '@/features/inbox/chat-header'
import { Composer } from '@/features/inbox/composer'
import { MessageList } from '@/features/inbox/message-list'
import { contactName } from '@/features/inbox/inbox-utils'
import type { ChatDetailResponse, ChatSummary } from '@/types/api'

interface ChatThreadPaneProps {
  chatId: string
  chat: ChatSummary | undefined
  detail: ChatDetailResponse | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  now: number
  actions: ChatActions
  isAdmin: boolean
  onBack: () => void
  onOpenDetails: () => void
  onOpenTemplates: () => void
}

function ComposerSkeleton() {
  return (
    <div className="shrink-0 border-t border-border bg-sheet px-3 py-3 sm:px-4" aria-hidden="true">
      <Skeleton className="h-11 w-full rounded-md" />
      <div className="mt-2 flex items-center justify-between gap-3">
        <Skeleton className="h-2.5 w-32" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function ChatThreadPane({
  chatId,
  chat,
  detail,
  isLoading,
  isError,
  onRetry,
  now,
  actions,
  isAdmin,
  onBack,
  onOpenDetails,
  onOpenTemplates,
}: ChatThreadPaneProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader
        chatId={chatId}
        chat={chat}
        detail={detail}
        now={now}
        actions={actions}
        onBack={onBack}
        onOpenDetails={onOpenDetails}
      />
      <MessageList
        chatId={chatId}
        chatName={chat ? contactName(chat) : chatId}
        messages={detail?.messages}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        isAdmin={isAdmin}
        now={now}
      />
      {detail ? (
        <Composer
          key={chatId}
          chatId={chatId}
          meta={detail.meta}
          now={now}
          onOpenTemplates={onOpenTemplates}
          onOpenDetails={onOpenDetails}
        />
      ) : isLoading ? (
        <ComposerSkeleton />
      ) : null}
    </div>
  )
}
