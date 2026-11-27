import { CircleAlertIcon, EyeIcon, EyeOffIcon, Loader2Icon, MoonIcon, SunIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ByGrowLogo, ByGrowMark } from '@/components/brand/bygrow-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SessionSplash } from '@/features/auth/require-auth'
import { useAuth } from '@/features/auth/auth-context'
import { useTheme } from '@/features/theme/theme-context'
import { getLoginErrorMessage } from '@/lib/errors'
import { isEmail } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/use-document-title'

interface FormErrors {
  email?: string
  password?: string
}

function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/inbox'
}

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useDocumentTitle('Entrar')

  if (loading) return <SessionSplash />
  if (user) {
    return (
      <Navigate to={safeRedirect((location.state as { from?: unknown } | null)?.from)} replace />
    )
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!isEmail(email)) next.email = 'Escribe un correo válido'
    if (!password) next.password = 'La contraseña es obligatoria'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(safeRedirect((location.state as { from?: unknown } | null)?.from), {
        replace: true,
      })
    } catch (error) {
      setFormError(getLoginErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh bg-frame p-2 sm:p-4 lg:p-5">
      <div className="mx-auto grid w-full max-w-[1560px] overflow-hidden rounded-2xl border border-border bg-sheet lg:grid-cols-[minmax(0,0.94fr)_minmax(440px,1.06fr)] lg:p-2">
        <aside className="relative hidden overflow-hidden rounded-xl bg-secondary p-10 text-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-primary">
              <ByGrowMark className="h-8" />
              <span className="font-display text-[24px] leading-none font-bold tracking-[-0.045em]">
                bygrow
              </span>
              <span className="ml-1 border-l border-primary/20 pl-2 text-[12px] font-medium text-muted-foreground">
                Inbox
              </span>
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">Uso interno</span>
          </div>

          <div className="max-w-[440px]">
            <ByGrowMark className="mb-[clamp(1rem,4svh,2.5rem)] h-[clamp(3.5rem,18svh,9rem)] text-primary xl:h-[clamp(3.5rem,18svh,11rem)]" />
            <p className="font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-primary">
              Bandeja del equipo
            </p>
            <p className="mt-5 max-w-[340px] text-[15px] leading-6 text-muted-foreground">
              Responder a tiempo, cuidar la ventana de 24 horas y mantener a la vista el
              consentimiento de cada contacto.
            </p>
          </div>

          <div className="flex items-end justify-between gap-8">
            <p className="max-w-[250px] text-[13px] leading-5 text-muted-foreground">
              WhatsApp Business · Conversaciones y seguimiento
            </p>
            <p className="text-right text-[13px] leading-5 text-muted-foreground">
              Dosquebradas
              <br />
              Colombia
            </p>
          </div>
        </aside>

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}
            >
              {theme === 'light' ? (
                <MoonIcon className="size-4" aria-hidden="true" />
              ) : (
                <SunIcon className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          <div className="w-full max-w-[360px]">
            <div className="mb-10 flex items-center gap-2 lg:hidden">
              <ByGrowLogo />
            </div>

            <div className="mb-8">
              <h1 className="font-display text-[26px] leading-[1.03] font-semibold tracking-[-0.045em] sm:text-[30px] lg:text-[32px]">
                ByGrow Inbox
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Bandeja del equipo. Ingresa con tu cuenta de ByGrow.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Correo</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
                  }}
                  autoComplete="username"
                  inputMode="email"
                  placeholder="tu@bygrow.co"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  disabled={submitting}
                  className="h-10"
                />
                {errors.email ? (
                  <p id="login-email-error" className="text-[12px] text-destructive">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (errors.password) {
                        setErrors((current) => ({ ...current, password: undefined }))
                      }
                    }}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    disabled={submitting}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p id="login-password-error" className="text-[12px] text-destructive">
                    {errors.password}
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

              <Button type="submit" className="h-10 w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {submitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-6 text-[13px] leading-5 text-muted-foreground">
              Acceso exclusivo para el equipo de ByGrow. La sesión se conserva en este navegador
              mediante una cookie segura.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
