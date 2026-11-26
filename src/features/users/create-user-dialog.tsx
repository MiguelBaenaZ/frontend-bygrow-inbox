import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usersApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { isEmail } from '@/lib/utils'
import { queryKeys } from '@/lib/query-keys'
import type { Role } from '@/types/api'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  role?: string
}

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('asesor')
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const createUser = useMutation({
    mutationFn: () =>
      usersApi.create({
        name: name.trim() || undefined,
        email: email.trim(),
        password,
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
      toast.success('Usuario creado')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setFormError(getErrorMessage(error, 'No se pudo crear el usuario.'))
    },
  })

  function validate(): boolean {
    const next: FormErrors = {}
    if (name.trim().length > 80) next.name = 'El nombre no puede superar 80 caracteres'
    if (!isEmail(email)) next.email = 'Escribe un correo válido'
    if (password.length < 12) next.password = 'La contraseña debe tener al menos 12 caracteres'
    if (role !== 'admin' && role !== 'asesor') next.role = 'Elige un rol'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    createUser.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            La cuenta podrá entrar a la bandeja con el correo y la contraseña que definas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-user-name">Nombre</Label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
              }}
              autoComplete="name"
              placeholder="Opcional"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'new-user-name-error' : undefined}
              disabled={createUser.isPending}
            />
            {errors.name ? (
              <p id="new-user-name-error" className="text-[12px] text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-email">Correo</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
              }}
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@bygrow.co"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'new-user-email-error' : undefined}
              disabled={createUser.isPending}
            />
            {errors.email ? (
              <p id="new-user-email-error" className="text-[12px] text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-password">Contraseña</Label>
            <PasswordInput
              id="new-user-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) {
                  setErrors((current) => ({ ...current, password: undefined }))
                }
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="new-user-password-hint"
              disabled={createUser.isPending}
            />
            <p
              id="new-user-password-hint"
              className={errors.password ? 'text-[12px] text-destructive' : 'text-[11px] text-muted-foreground'}
            >
              {errors.password ?? 'Mínimo 12 caracteres.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-role">Rol</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              disabled={createUser.isPending}
            >
              <SelectTrigger id="new-user-role" aria-label="Rol del usuario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asesor">Asesor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Los administradores también pueden gestionar el equipo y borrar conversaciones.
            </p>
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
              disabled={createUser.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
