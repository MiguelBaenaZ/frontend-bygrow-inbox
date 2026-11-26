import { CircleAlertIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ErrorNotice({
  message,
  details = [],
  className,
}: {
  message: string
  details?: string[]
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger-ink',
        className,
      )}
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p>{message}</p>
        {details.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4">
            {details.map((detail, index) => (
              <li key={`${index}-${detail}`}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
