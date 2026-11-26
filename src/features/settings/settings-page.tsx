import { useMutation } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  CircleAlertIcon,
  Loader2Icon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { useTheme } from '@/features/theme/theme-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError, authApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { formatRole } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PasswordErrors {
  current?: string
  next?: string
  confirmation?: string
}

function SettingsRow({
  title,
  description,
  children,
  last = false,
}: {
  title: string
  description: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <section
      className={cn(
        'grid gap-4 py-7 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)] lg:gap-12',
        !last && 'border-b border-border',
      )}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-[300px] text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  useDocumentTitle('Ajustes')

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setErrors({})
      setFormError(null)
      toast.success('Contraseña actualizada')
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('La contraseña actual no es correcta')
        return
      }
      setFormError(getErrorMessage(error, 'No se pudo cambiar la contraseña.'))
    },
  })

  function validate(): boolean {
    const next: PasswordErrors = {}
    if (!currentPassword) next.current = 'La contraseña actual es obligatoria'
    if (newPassword.length < 12) {
      next.next = 'La contraseña debe tener al menos 12 caracteres'
    } else if (newPassword === currentPassword) {
      next.next = 'La nueva contraseña debe ser diferente a la actual'
    }
    if (confirmation !== newPassword) {
      next.confirmation = 'Las contraseñas no coinciden'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    changePassword.mutate()
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[72px] shrink-0 items-center border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-display text-[23px] leading-none font-semibold tracking-[-0.04em]">
            Ajustes
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Tu cuenta, la seguridad de la sesión y la apariencia de la bandeja.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1040px] px-4 py-5 sm:px-6 lg:px-8">
          <SettingsRow
            title="Cuenta"
            description="Esta es la cuenta con la que estás usando ByGrow Inbox."
          >
            <div className="flex items-center gap-3 rounded-xl bg-raised p-4">
              <UserAvatar
                name={user?.email.split('@')[0] ?? user?.email}
                email={user?.email}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">
                  {user?.email}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="neutral">{formatRole(user?.role ?? 'asesor')}</Badge>
                  <span className="text-[12px] text-muted-foreground">Sesión activa</span>
                </div>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            title="Contraseña"
            description="Al guardar se cierran las demás sesiones de tu cuenta. Esta sesión se mantiene abierta."
          >
            <form
              onSubmit={handlePasswordSubmit}
              noValidate
              className="rounded-xl bg-raised p-4"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <PasswordInput
                    id="current-password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value)
                      if (errors.current) {
                        setErrors((current) => ({ ...current, current: undefined }))
                      }
                    }}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.current)}
                    aria-describedby={errors.current ? 'current-password-error' : undefined}
                    disabled={changePassword.isPending}
                    className="bg-sheet"
                  />
                  {errors.current ? (
                    <p id="current-password-error" className="text-[12px] text-destructive">
                      {errors.current}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Contraseña nueva</Label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        if (errors.next) {
                          setErrors((current) => ({ ...current, next: undefined }))
                        }
                      }}
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.next)}
                      aria-describedby="new-password-hint"
                      disabled={changePassword.isPending}
                      className="bg-sheet"
                    />
                    <p
                      id="new-password-hint"
                      className={
                        errors.next
                          ? 'text-[12px] text-destructive'
                          : 'text-[12px] text-muted-foreground'
                      }
                    >
                      {errors.next ?? 'Mínimo 12 caracteres.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password-confirmation">Confirmar contraseña</Label>
                    <PasswordInput
                      id="new-password-confirmation"
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value)
                        if (errors.confirmation) {
                          setErrors((current) => ({
                            ...current,
                            confirmation: undefined,
                          }))
                        }
                      }}
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.confirmation)}
                      aria-describedby={
                        errors.confirmation
                          ? 'new-password-confirmation-error'
                          : undefined
                      }
                      disabled={changePassword.isPending}
                      className="bg-sheet"
                    />
                    {errors.confirmation ? (
                      <p
                        id="new-password-confirmation-error"
                        className="text-[12px] text-destructive"
                      >
                        {errors.confirmation}
                      </p>
                    ) : null}
                  </div>
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

                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={changePassword.isPending}>
                    {changePassword.isPending ? (
                      <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    Guardar contraseña
                  </Button>
                </div>
              </div>
            </form>
          </SettingsRow>

          <SettingsRow
            title="Apariencia"
            description="El tema claro es el predeterminado. La preferencia se guarda en este navegador."
          >
            <div className="grid gap-2 rounded-xl bg-raised p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  theme === 'light'
                    ? 'border-primary/40 bg-active'
                    : 'border-border bg-sheet hover:bg-muted/60',
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-sheet text-foreground">
                  <SunIcon className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[13px] font-medium">Claro</span>
                  <span className="block text-[12px] text-muted-foreground">Hueso y salvia</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  theme === 'dark'
                    ? 'border-primary/40 bg-active'
                    : 'border-border bg-sheet hover:bg-muted/60',
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-[#07110c] text-[#b8e06a]">
                  <MoonIcon className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[13px] font-medium">Oscuro</span>
                  <span className="block text-[12px] text-muted-foreground">Void y brote</span>
                </span>
              </button>
            </div>
          </SettingsRow>

          {user?.role === 'admin' ? (
            <SettingsRow
              title="Equipo"
              description="Crea cuentas, ajusta roles y restablece contraseñas del equipo."
            >
              <div className="flex flex-col gap-3 rounded-xl bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <UsersIcon className="size-4" aria-hidden="true" />
                  </span>
                  <p className="text-[13px] text-muted-foreground">
                    Solo los administradores pueden gestionar esta sección.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 bg-sheet">
                  <Link to="/users">
                    Gestionar equipo
                    <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </SettingsRow>
          ) : null}

          <SettingsRow
            title="Sesión"
            description="Cerrar sesión no borra la conversación ni cambia el trabajo del equipo."
            last
          >
            <div className="flex flex-col gap-3 rounded-xl bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[440px] text-[13px] leading-5 text-muted-foreground">
                Cierra la bandeja en este navegador. Necesitarás tu correo y contraseña para
                volver a entrar.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="shrink-0 bg-sheet"
              >
                {loggingOut ? (
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOutIcon className="size-3.5" aria-hidden="true" />
                )}
                Cerrar sesión
              </Button>
            </div>
          </SettingsRow>
        </div>
      </div>
    </div>
  )
}
