import { ShieldXIcon } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

export function RequireAdmin() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
        <ShieldXIcon className="mb-3 size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">Acceso restringido</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          No tienes permiso para esta acción. Solo un administrador puede gestionar el equipo.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/inbox">Volver a la bandeja</Link>
        </Button>
      </div>
    )
  }

  return <Outlet />
}
