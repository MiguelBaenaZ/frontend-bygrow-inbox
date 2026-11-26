import { Link } from 'react-router-dom'

import { ByGrowLogo } from '@/components/brand/bygrow-logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotFoundPage() {
  const { user } = useAuth()
  useDocumentTitle('Página no encontrada')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <ByGrowLogo />
      <p className="mt-12 text-[12px] font-medium text-muted-foreground">Error 404</p>
      <h1 className="mt-2 font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.045em]">
        Esta página no existe
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Revisa la dirección o vuelve a la bandeja para seguir con las conversaciones.
      </p>
      <Button asChild className="mt-6">
        <Link to={user ? '/inbox' : '/login'}>{user ? 'Volver a la bandeja' : 'Ir a iniciar sesión'}</Link>
      </Button>
    </main>
  )
}
