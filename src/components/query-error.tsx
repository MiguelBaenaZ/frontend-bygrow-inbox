import { CircleAlertIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function QueryError({
  title = 'No se pudo cargar la información',
  description = 'Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
  className,
  compact = false,
}: QueryErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      <CircleAlertIcon className="mb-2 size-4 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
