import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/auth-context'
import { usersApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/query-keys'
import type { PublicUser, Role } from '@/types/api'

interface EditUserDialogProps {
  user: PublicUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user?.name ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'asesor')
  const [active, setActive] = useState(user?.active ?? true)
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const isSelf = Boolean(user && currentUser?.id === user.id)

  const updateUser = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('user_required')
      return usersApi.update(user.id, {
        name: name.trim(),
        role: isSelf ? undefined : role,
        active: isSelf ? undefined : active,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
      toast.success('Usuario actualizado')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setFormError(getErrorMessage(error, 'No se pudo actualizar el usuario.'))
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (name.trim().length > 80) {
      setNameError('El nombre no puede superar 80 caracteres')
      return
    }
    setNameError(null)
    updateUser.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            {user ? `Ajusta los datos de ${user.name || user.email}.` : 'Ajusta los datos de la cuenta.'}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Correo</Label>
              <Input id="edit-user-email" value={user.email} readOnly disabled />
              <p className="text-[11px] text-muted-foreground">
                El correo de acceso no se puede cambiar desde el panel.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nombre</Label>
              <Input
                id="edit-user-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
                autoComplete="name"
                placeholder="Sin nombre"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'edit-user-name-error' : undefined}
                disabled={updateUser.isPending}
              />
              {nameError ? (
                <p id="edit-user-name-error" className="text-[12px] text-destructive">
                  {nameError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Rol</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as Role)}
                disabled={updateUser.isPending || isSelf}
              >
                <SelectTrigger id="edit-user-role" aria-label="Rol del usuario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asesor">Asesor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {isSelf ? (
                <p className="text-[11px] text-muted-foreground">
                  No puedes cambiar tu propio rol de administrador.
                </p>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="edit-user-active" className="text-[13px]">
                  Cuenta activa
                </Label>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {active
                    ? 'La persona puede iniciar sesión y usar la bandeja.'
                    : 'La persona no podrá iniciar sesión hasta que la actives de nuevo.'}
                </p>
              </div>
              <Switch
                id="edit-user-active"
                checked={active}
                onCheckedChange={setActive}
                disabled={updateUser.isPending || isSelf}
                aria-label="Cuenta activa"
              />
            </div>
            {isSelf ? (
              <p className="text-[11px] text-muted-foreground">
                No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.
              </p>
            ) : null}

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
                disabled={updateUser.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecciona un usuario para editarlo.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
