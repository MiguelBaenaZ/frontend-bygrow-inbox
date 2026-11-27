import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  Loader2Icon,
  RefreshCwIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { summaryNeedsToggle } from '@/features/inbox/inbox-utils'
import { chatsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime, formatRelative } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import type { ChatDetailResponse, ConversationSummary } from '@/types/api'

interface SummaryPanelProps {
  chatId: string
  summary: ConversationSummary | null | undefined
  now: number
}

export function SummaryPanel({ chatId, summary, now }: SummaryPanelProps) {
  const queryClient = useQueryClient()
  const regionId = useId()
  const [expanded, setExpanded] = useState(false)
  const [rebuildError, setRebuildError] = useState<string | null>(null)

  const text = typeof summary?.summary === 'string' ? summary.summary : ''
  const hasSummary = text.trim().length > 0
  const isLong = hasSummary && summaryNeedsToggle(text)
  const updatedAt = summary?.summaryUpdatedAt ?? null
  const textId = `${regionId}-text`

  const rebuild = useMutation({
    mutationFn: () => chatsApi.rebuildSummary(chatId),
    onSuccess: (response) => {
      if (!response.ok) {
        setRebuildError('No se pudo regenerar el resumen. Inténtalo de nuevo.')
        return
      }

      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId), (current) =>
        current ? { ...current, summary: response.summary } : current,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats })
      setRebuildError(null)
      toast.success('Resumen regenerado')
    },
    onError: (error: Error) => {
      setRebuildError(getErrorMessage(error, 'No se pudo regenerar el resumen.'))
    },
  })

  function regenerate() {
    setRebuildError(null)
    rebuild.mutate()
  }

  return (
    <section className="border-b border-border px-4 py-4" aria-labelledby={`${regionId}-title`}>
      <div className="min-w-0">
        <h3 id={`${regionId}-title`} className="text-[13px] font-semibold text-foreground">
          Resumen
        </h3>
        {hasSummary ? (
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {updatedAt ? (
              <span title={formatDateTime(updatedAt)}>
                Actualizado {formatRelative(updatedAt, now)}
              </span>
            ) : (
              'Sin fecha de actualización'
            )}
          </p>
        ) : null}
      </div>

      {hasSummary ? (
        <>
          <p
            id={textId}
            data-testid="summary-text"
            className={cn(
              'mt-2 break-words text-[12px] leading-5 whitespace-pre-wrap text-foreground',
              isLong && !expanded && 'max-h-36 overflow-hidden',
            )}
          >
            {text}
          </p>
          {isLong ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="mt-1 h-auto px-0 py-0.5 text-[11px]"
              aria-expanded={expanded}
              aria-controls={textId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <ChevronUpIcon className="size-3" aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="size-3" aria-hidden="true" />
              )}
              {expanded ? 'Contraer resumen' : 'Ver resumen completo'}
            </Button>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Aún no hay resumen: se genera después de unos mensajes.
        </p>
      )}

      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={regenerate}
          disabled={rebuild.isPending}
          aria-busy={rebuild.isPending}
        >
          {rebuild.isPending ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          )}
          {rebuild.isPending ? 'Regenerando resumen…' : 'Regenerar resumen'}
        </Button>
      </div>

      {rebuildError ? (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-md bg-danger-soft px-2.5 py-2 text-[11px] leading-4 text-danger-ink"
        >
          <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{rebuildError}</span>
        </div>
      ) : null}
    </section>
  )
}
