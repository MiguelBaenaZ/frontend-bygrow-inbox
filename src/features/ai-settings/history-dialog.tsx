import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HistoryIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  describeAiSettingsError,
  type AiSettingsErrorInfo,
} from '@/features/ai-settings/ai-settings-utils'
import { ErrorNotice } from '@/features/ai-settings/error-notice'
import { useAiSettingsHistoryQuery } from '@/features/ai-settings/queries'
import { aiSettingsApi } from '@/lib/api'
import { formatDateTime, formatRelative } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import type { AiSettingsHistoryEntry, AiSettingsMutationResponse } from '@/types/api'

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: number
  onRestored: (response: AiSettingsMutationResponse) => void
}

function HistorySkeleton() {
  return (
    <div className="space-y-0" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 border-b border-rule px-3 py-3.5 last:border-b-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-48" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  )
}

export function HistoryDialog({
  open,
  onOpenChange,
  currentVersion,
  onRestored,
}: HistoryDialogProps) {
  const queryClient = useQueryClient()
  const historyQuery = useAiSettingsHistoryQuery(open)
  const [restoreTarget, setRestoreTarget] = useState<AiSettingsHistoryEntry | null>(null)
  const [restoreError, setRestoreError] = useState<AiSettingsErrorInfo | null>(null)

  const restoreVersion = useMutation({
    mutationFn: (version: number) => aiSettingsApi.restore(version),
    onSuccess: (response) => {
      setRestoreTarget(null)
      setRestoreError(null)
      onRestored(response)
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettingsHistory })
      onOpenChange(false)
      toast.success('Versión restaurada')
    },
    onError: (error) => {
      setRestoreTarget(null)
      setRestoreError(
        describeAiSettingsError(error, 'No se pudo restaurar la versión. Inténtalo de nuevo.'),
      )
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRestoreTarget(null)
      setRestoreError(null)
    }
    onOpenChange(nextOpen)
  }

  const versions = historyQuery.data ?? []
  const historyError = historyQuery.isError
    ? describeAiSettingsError(
        historyQuery.error,
        'No se pudo cargar el historial. Revisa tu conexión e inténtalo de nuevo.',
      )
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones</DialogTitle>
            <DialogDescription>
              Cada restauración crea una versión nueva con el contenido elegido. Las versiones
              anteriores nunca se borran.
            </DialogDescription>
          </DialogHeader>

          {restoreError ? (
            <ErrorNotice message={restoreError.message} details={restoreError.details} />
          ) : null}

          <div className="max-h-[52svh] min-h-[120px] overflow-y-auto rounded-lg border border-border">
            {historyQuery.isLoading ? <HistorySkeleton /> : null}

            {historyError && !historyQuery.isLoading ? (
              <QueryError
                compact
                title="No se pudo cargar el historial"
                description={historyError.message}
                onRetry={() => void historyQuery.refetch()}
              />
            ) : null}

            {!historyQuery.isLoading && !historyQuery.isError && versions.length === 0 ? (
              <EmptyState
                compact
                icon={HistoryIcon}
                title="Todavía no hay versiones"
                description="Las versiones aparecerán aquí después de guardar cambios."
              />
            ) : null}

            {!historyQuery.isLoading && !historyQuery.isError && versions.length > 0 ? (
              <ol className="divide-y divide-rule">
                {versions.map((entry) => {
                  const isCurrent = entry.version === currentVersion
                  return (
                    <li
                      key={entry.version}
                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">
                            Versión {entry.version}
                          </span>
                          {isCurrent ? <Badge variant="open">Actual</Badge> : null}
                        </div>
                        <p
                          className="mt-0.5 text-[12px] text-muted-foreground"
                          title={formatDateTime(entry.updatedAt)}
                        >
                          {formatDateTime(entry.updatedAt)} ·{' '}
                          <span className="num">{formatRelative(entry.updatedAt)}</span>
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          Por {entry.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={restoreVersion.isPending}
                        onClick={() => {
                          setRestoreError(null)
                          setRestoreTarget(entry)
                        }}
                      >
                        Restaurar
                      </Button>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRestoreTarget(null)
        }}
        title={
          restoreTarget ? `Restaurar la versión ${restoreTarget.version}` : 'Restaurar versión'
        }
        description="Se creará una versión nueva con este contenido. Podrás seguir viendo todas las versiones en el historial."
        confirmLabel="Restaurar versión"
        isPending={restoreVersion.isPending}
        onConfirm={() => {
          if (restoreTarget) restoreVersion.mutate(restoreTarget.version)
        }}
      />
    </>
  )
}
