import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { QueryError } from '@/components/query-error'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/auth-context'
import { CreateUserDialog } from '@/features/users/create-user-dialog'
import { EditUserDialog } from '@/features/users/edit-user-dialog'
import { useUsersQuery } from '@/features/users/queries'
import { ResetPasswordDialog } from '@/features/users/reset-password-dialog'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, formatRole } from '@/lib/format'
import { normalizeSearch } from '@/lib/utils'
import type { PublicUser } from '@/types/api'

function displayName(user: PublicUser): string {
  return user.name?.trim() || user.email
}

function secondaryIdentity(user: PublicUser): string {
  return user.name?.trim() ? user.email : 'Sin nombre registrado'
}

function RolesReference({ className }: { className?: string }) {
  return (
    <aside className={className}>
      <div className="px-5 py-5">
        <h2 className="text-[13px] font-semibold text-foreground">Roles y accesos</h2>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
          Cada cuenta entra con su propio correo. Los permisos se aplican en el servidor, no solo
          en la interfaz.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Administrador</p>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Gestiona cuentas, borra conversaciones y ejecuta la retención y la limpieza de media.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Asesor</p>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Responde, pausa el bot, cambia la etapa del lead y registra consentimiento. No
              gestiona cuentas ni borra información.
            </p>
          </div>
        </div>
        <p className="mt-5 border-t border-border pt-4 text-[13px] leading-5 text-muted-foreground">
          Solo un administrador puede restablecer contraseñas. El sistema impide que la instancia
          se quede sin un administrador activo.
        </p>
      </div>
    </aside>
  )
}



function UsersToolbar({
  search,
  onSearch,
  total,
}: {
  search: string
  onSearch: (value: string) => void
  total: number
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="relative w-full sm:max-w-[300px]">
        <label htmlFor="users-search" className="sr-only">
          Buscar usuarios
        </label>
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="users-search"
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nombre o correo"
          className="h-8 pl-8 text-[13px]"
          autoComplete="off"
        />
      </div>
      <p className="num text-[12px] text-muted-foreground">
        {total} {total === 1 ? 'cuenta' : 'cuentas'}
      </p>
    </div>
  )
}

function UserRowActions({
  user,
  isSelf,
  onEdit,
  onResetPassword,
}: {
  user: PublicUser
  isSelf: boolean
  onEdit: (user: PublicUser) => void
  onResetPassword: (user: PublicUser) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Acciones para ${user.name || user.email}`}
        >
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(user)}>
          <PencilIcon aria-hidden="true" />
          Editar
        </DropdownMenuItem>
        {!isSelf ? (
          <DropdownMenuItem onSelect={() => onResetPassword(user)}>
            <KeyRoundIcon aria-hidden="true" />
            Restablecer contraseña
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UsersSkeleton() {
  return (
    <div className="space-y-0" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-rule px-4 py-3.5 sm:px-5"
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  )
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const usersQuery = useUsersQuery()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null)
  const [resetUser, setResetUser] = useState<PublicUser | null>(null)
  useDocumentTitle('Equipo')

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])
  const filteredUsers = useMemo(() => {
    const term = normalizeSearch(search)
    if (!term) return users
    return users.filter((user) =>
      normalizeSearch(`${user.name ?? ''} ${user.email}`).includes(term),
    )
  }, [search, users])

  const activeUsers = users.filter((user) => user.active).length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-display text-[23px] leading-none font-semibold tracking-[-0.04em]">
            Equipo
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {usersQuery.isLoading
              ? 'Cargando cuentas…'
              : `${activeUsers} activas de ${users.length} cuentas`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlusIcon className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Crear usuario</span>
          <span className="sm:hidden">Crear</span>
        </Button>
      </div>

      <UsersToolbar search={search} onSearch={setSearch} total={filteredUsers.length} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {usersQuery.isLoading ? <UsersSkeleton /> : null}

        {usersQuery.isError && !usersQuery.isLoading ? (
          <QueryError
            title="No se pudieron cargar las cuentas"
            description="El equipo no está disponible en este momento."
            onRetry={() => void usersQuery.refetch()}
          />
        ) : null}

        {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No hay cuentas todavía"
            description="Crea la primera cuenta del equipo para que pueda entrar a la bandeja."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <UserPlusIcon className="size-3.5" aria-hidden="true" />
                Crear usuario
              </Button>
            }
          />
        ) : null}

        {!usersQuery.isLoading &&
        !usersQuery.isError &&
        users.length > 0 &&
        filteredUsers.length === 0 ? (
          <EmptyState
            title="No encontramos coincidencias"
            description="Prueba con otro nombre o correo."
            action={
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
            }
            compact
          />
        ) : null}

        {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length > 0 ? (
          <div className="min-h-full min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_296px]">
            <div className="min-w-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[46%] px-4 sm:px-5">Persona</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const isSelf = currentUser?.id === user.id
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="px-4 sm:px-5">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={displayName(user)}
                                email={user.email}
                                size="md"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-medium text-foreground">
                                  {displayName(user)}
                                  {isSelf ? (
                                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                                      (tú)
                                    </span>
                                  ) : null}
                                </p>
                                <p className="truncate text-[13px] text-muted-foreground">
                                  {secondaryIdentity(user)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] text-foreground">
                            {formatRole(user.role)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.active ? 'open' : 'neutral'}>
                              {user.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="num text-[13px] whitespace-nowrap text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="pr-3 text-right">
                            <UserRowActions
                              user={user}
                              isSelf={isSelf}
                              onEdit={setEditingUser}
                              onResetPassword={setResetUser}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <div className="divide-y divide-rule">
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id
                    return (
                      <div key={user.id} className="flex items-start gap-3 px-4 py-3.5">
                        <UserAvatar
                          name={displayName(user)}
                          email={user.email}
                          size="md"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium">
                            {displayName(user)}
                            {isSelf ? (
                              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                                (tú)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-[13px] text-muted-foreground">
                            {secondaryIdentity(user)}
                          </p>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {formatRole(user.role)} ·{' '}
                            <span className={user.active ? 'text-foreground' : ''}>
                              {user.active ? 'Activo' : 'Inactivo'}
                            </span>{' '}
                            · {formatDate(user.createdAt)}
                          </p>
                        </div>
                        <UserRowActions
                          user={user}
                          isSelf={isSelf}
                          onEdit={setEditingUser}
                          onResetPassword={setResetUser}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <RolesReference className="hidden border-l border-border min-[1180px]:block" />
            <RolesReference className="border-t border-border min-[1180px]:hidden" />
          </div>
        ) : null}
      </div>

      {createOpen ? (
        <CreateUserDialog open onOpenChange={setCreateOpen} />
      ) : null}
      {editingUser ? (
        <EditUserDialog
          user={editingUser}
          open
          onOpenChange={(open) => {
            if (!open) setEditingUser(null)
          }}
        />
      ) : null}
      {resetUser ? (
        <ResetPasswordDialog
          user={resetUser}
          open
          onOpenChange={(open) => {
            if (!open) setResetUser(null)
          }}
        />
      ) : null}
    </div>
  )
}
