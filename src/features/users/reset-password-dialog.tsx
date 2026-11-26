import { useMutation } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { usersApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import type { PublicUser } from '@/types/api'

interface ResetPasswordDialogProps {
  user: PublicUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormErrors {
  password?: string
  confirmation?: string
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const resetPassword = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('user_required')
      return usersApi.resetPassword(user.id, password)
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setFormError(getErrorMessage(error, 'No se pudo cambiar la contraseña.'))
    },
  })

  function validate(): boolean {
    const next: FormErrors = {}
    if (password.length < 12) {
      next.password = 'La contraseña debe tener al menos 12 caracteres'
    }
    if (confirmation !== password) next.confirmation = 'Las contraseñas no coinciden'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    resetPassword.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            {user
              ? `Define una contraseña nueva para ${user.name || user.email}. Se cerrarán todas sus sesiones activas.`
              : 'Define una contraseña nueva para el usuario.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">Contraseña nueva</Label>
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="reset-password-hint"
              disabled={resetPassword.isPending}
            />
            <p
              id="reset-password-hint"
              className={
                errors.password ? 'text-[12px] text-destructive' : 'text-[11px] text-muted-foreground'
              }
            >
              {errors.password ?? 'Mínimo 12 caracteres.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirmation">Confirmar contraseña</Label>
            <PasswordInput
              id="reset-password-confirmation"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value)
                if (errors.confirmation) {
                  setErrors((current) => ({ ...current, confirmation: undefined }))
                }
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmation)}
              aria-describedby={errors.confirmation ? 'reset-password-confirmation-error' : undefined}
              disabled={resetPassword.isPending}
            />
            {errors.confirmation ? (
              <p
                id="reset-password-confirmation-error"
                className="text-[12px] text-destructive"
              >
                {errors.confirmation}
              </p>
            ) : null}
          </div>

          <div aria-live="polite">
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger-ink"
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={resetPassword.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
