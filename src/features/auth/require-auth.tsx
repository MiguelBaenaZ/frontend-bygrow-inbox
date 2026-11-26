import { Loader2Icon } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ByGrowLogo } from '@/components/brand/bygrow-logo'
import { useAuth } from '@/features/auth/auth-context'

export function SessionSplash() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-6"
      aria-live="polite"
      aria-busy="true"
    >
      <ByGrowLogo className="text-primary" markClassName="size-8" />
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        Cargando tu sesión
      </div>
    </div>
  )
}

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <SessionSplash />

  if (!user) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
