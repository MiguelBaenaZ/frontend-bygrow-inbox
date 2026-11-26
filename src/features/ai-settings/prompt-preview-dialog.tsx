import { CopyIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { describeAiSettingsError } from '@/features/ai-settings/ai-settings-utils'
import { ErrorNotice } from '@/features/ai-settings/error-notice'
import { copyToClipboard } from '@/lib/utils'

interface PromptPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: string | null
  isPending: boolean
  error: unknown
  onRetry: () => void
}

export function PromptPreviewDialog({
  open,
  onOpenChange,
  prompt,
  isPending,
  error,
  onRetry,
}: PromptPreviewDialogProps) {
  const errorInfo = error
    ? describeAiSettingsError(error, 'No se pudo generar la vista previa. Inténtalo de nuevo.')
    : null

  async function handleCopy() {
    if (!prompt) return
    try {
      await copyToClipboard(prompt)
      toast.success('Prompt copiado')
    } catch {
      toast.error('No se pudo copiar el prompt. Selecciónalo y cópialo manualmente.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista previa del prompt</DialogTitle>
          <DialogDescription>
            Este es el texto exacto que recibiría la IA con el contenido actual del formulario. No
            se guarda nada al generar la vista previa.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-raised/60 text-[13px] text-muted-foreground"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            Generando vista previa…
          </div>
        ) : null}

        {!isPending && errorInfo ? (
          <div className="space-y-3">
            <ErrorNotice message={errorInfo.message} details={errorInfo.details} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : null}

        {!isPending && !errorInfo && prompt !== null ? (
          <>
            <Textarea
              readOnly
              value={prompt}
              aria-label="Prompt resultante"
              className="max-h-[52svh] min-h-[260px] resize-y font-mono text-[12px] leading-5"
              spellCheck={false}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                <CopyIcon className="size-3.5" aria-hidden="true" />
                Copiar
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {!isPending && !errorInfo && prompt === null ? (
          <p className="text-[13px] text-muted-foreground">No hay contenido para previsualizar.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
