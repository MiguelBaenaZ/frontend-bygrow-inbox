import {
  CheckCheckIcon,
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mediaUrl } from '@/lib/api'
import { formatMessageKind, formatMessageStatus, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ThreadMessage } from '@/types/api'

interface MessageBubbleProps {
  message: ThreadMessage
  isAdmin: boolean
  onRequestDelete: (message: ThreadMessage) => void
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'failed') {
    return <CircleAlertIcon className="size-3.5 text-destructive" aria-hidden="true" />
  }
  if (status === 'read') {
    return <CheckCheckIcon className="size-3.5 text-primary" aria-hidden="true" />
  }
  if (status === 'delivered') {
    return <CheckCheckIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
  }
  return <CheckIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
}

function MediaContent({ message }: { message: ThreadMessage }) {
  const [imageFailed, setImageFailed] = useState(false)
  const source = message.media_key ? mediaUrl(message.media_key) : null

  if (!source) {
    return (
      <p className="text-[13px] leading-5 whitespace-pre-wrap text-muted-foreground">
        {message.body || formatMessageKind(message.kind)}
      </p>
    )
  }

  if (message.kind === 'image' || message.kind === 'sticker') {
    if (imageFailed) {
      return (
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-sheet px-2.5 py-2 text-[12px] font-medium text-primary hover:underline"
        >
          <DownloadIcon className="size-3.5" aria-hidden="true" />
          Abrir imagen
        </a>
      )
    }
    return (
      <a href={source} target="_blank" rel="noreferrer" className="block">
        <img
          src={source}
          crossOrigin="use-credentials"
          alt={message.direction === 'in' ? 'Imagen recibida' : 'Imagen enviada'}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="max-h-80 w-auto max-w-full rounded-lg border border-black/5 object-contain"
        />
      </a>
    )
  }

  if (message.kind === 'audio') {
    return (
      <audio
        controls
        preload="metadata"
        crossOrigin="use-credentials"
        className="h-9 w-[260px] max-w-full"
      >
        <source src={source} />
        Tu navegador no puede reproducir esta nota de voz.
      </audio>
    )
  }

  const isVideo = message.kind === 'video'
  return (
    <a
      href={source}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 rounded-lg border border-border bg-sheet px-3 py-2.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {isVideo ? (
          <DownloadIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <FileTextIcon className="size-3.5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block">
          {isVideo ? 'Abrir video' : 'Abrir documento'}
        </span>
        <span className="block text-[11px] font-normal text-muted-foreground">
          Archivo de WhatsApp
        </span>
      </span>
    </a>
  )
}

function MessageBody({ message }: { message: ThreadMessage }) {
  const text = message.body
    .replace(/^\[(foto enviada|sticker|nota de voz|documento|video)\]\s*/i, '')
    .trim()

  if (!text) return null

  return (
    <p className="mt-1 text-[13px] leading-5 break-words whitespace-pre-wrap">{text}</p>
  )
}

export function MessageBubble({ message, isAdmin, onRequestDelete }: MessageBubbleProps) {
  const outgoing = message.direction === 'out'
  const isMedia =
    Boolean(message.media_key) &&
    ['image', 'audio', 'document', 'video', 'sticker'].includes(message.kind)

  return (
    <div className={cn('group flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[min(82%,560px)] min-w-0 rounded-xl border px-3 py-2 text-foreground',
          outgoing
            ? 'rounded-tr-sm border-[#cfe0c3] bg-bubble-out dark:border-[#31482c]'
            : 'rounded-tl-sm border-border bg-bubble-in',
        )}
      >
        {message.kind === 'template' ? (
          <Badge variant="outline" className="mb-1.5">
            Plantilla
          </Badge>
        ) : null}

        {isMedia ? <MediaContent message={message} /> : null}
        <MessageBody message={message} />
        {!isMedia && !message.body.trim() ? (
          <p className="text-[12px] text-muted-foreground">{formatMessageKind(message.kind)}</p>
        ) : null}

        <div
          className={cn(
            'mt-1 flex items-center gap-1.5 text-[11px] leading-none text-muted-foreground',
            outgoing ? 'justify-end' : 'justify-start',
          )}
        >
          <span title={formatMessageStatus(message.status)} className="num">
            {formatTime(message.created_at)}
          </span>
          {outgoing ? (
            <>
              <span title={formatMessageStatus(message.status) || 'Enviado'}>
                <StatusIcon status={message.status} />
              </span>
              <span className="sr-only">
                {formatMessageStatus(message.status) || 'Enviado'} a las{' '}
                {formatTime(message.created_at)}
              </span>
            </>
          ) : null}
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ms-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label={`Acciones del mensaje de las ${formatTime(message.created_at)}`}
                >
                  <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onRequestDelete(message)}
                >
                  <Trash2Icon aria-hidden="true" />
                  Eliminar mensaje
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  )
}
