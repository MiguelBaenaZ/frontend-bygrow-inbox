import {
  ChevronDownIcon,
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { ByGrowLogo, ByGrowMark } from '@/components/brand/bygrow-logo'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/auth-context'
import { useTheme } from '@/features/theme/theme-context'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/utils'
import { formatDate, formatRole, formatTime } from '@/lib/format'

const navItems = [
  { to: '/inbox', label: 'Bandeja', icon: InboxIcon, adminOnly: false },
  { to: '/users', label: 'Equipo', icon: UsersIcon, adminOnly: true },
] as const

function sectionName(pathname: string): string {
  if (pathname.startsWith('/users')) return 'Equipo'
  if (pathname.startsWith('/settings')) return 'Ajustes'
  return 'Bandeja'
}

function NavRow({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string
  label: string
  icon: typeof InboxIcon
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-active text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            )}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const { theme, setTheme } = useTheme()

  if (!user) return null

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            compact && 'justify-center p-1.5',
          )}
          aria-label="Abrir menú de cuenta"
        >
          <UserAvatar name={user.email.split('@')[0] ?? user.email} email={user.email} size="sm" />
          {!compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-foreground">
                  {user.email}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {formatRole(user.role)}
                </span>
              </span>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[232px]">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-[12px] font-medium text-foreground">{user.email}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {formatRole(user.role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon aria-hidden="true" />
            Ajustes de la cuenta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <MoonIcon aria-hidden="true" /> : <SunIcon aria-hidden="true" />}
          {theme === 'light' ? 'Tema oscuro' : 'Tema claro'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={loggingOut}
          onSelect={(event) => {
            event.preventDefault()
            void handleLogout()
          }}
        >
          <LogOutIcon aria-hidden="true" />
          {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DesktopSidebar() {
  const { user } = useAuth()

  return (
    <aside className="hidden h-svh w-[228px] shrink-0 flex-col px-3 py-4 lg:flex">
      <Link
        to="/inbox"
        className="flex min-h-12 items-center rounded-md px-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="ByGrow Inbox, ir a la bandeja"
      >
        <ByGrowLogo />
      </Link>

      <div className="mt-7 mb-2 px-2.5 text-[11px] font-medium text-muted-foreground">
        Operación
      </div>
      <nav className="space-y-0.5" aria-label="Navegación principal">
        {navItems.map((item) =>
          item.adminOnly && user?.role !== 'admin' ? null : (
            <NavRow key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ),
        )}
      </nav>

      <div className="mt-auto space-y-1">
        <NavRow to="/settings" label="Ajustes" icon={SettingsIcon} />
        <div className="border-t border-border/80 pt-2">
          <AccountMenu />
        </div>
      </div>
    </aside>
  )
}

function MobileNavigation({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] border-r bg-frame">
        <SheetHeader className="border-b-0 bg-frame px-4 py-5">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <ByGrowLogo />
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <p className="mb-2 px-2.5 text-[11px] font-medium text-muted-foreground">Operación</p>
          <nav className="space-y-0.5" aria-label="Navegación principal">
            {navItems.map((item) =>
              item.adminOnly && user?.role !== 'admin' ? null : (
                <NavRow
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  onNavigate={() => onOpenChange(false)}
                />
              ),
            )}
            <NavRow
              to="/settings"
              label="Ajustes"
              icon={SettingsIcon}
              onNavigate={() => onOpenChange(false)}
            />
          </nav>
          <div className="mt-auto border-t border-border/80 py-3">
            <p className="mb-2 truncate px-2.5 text-[12px] text-muted-foreground">
              {user?.email} · {formatRole(user?.role ?? 'asesor')}
            </p>
            <div className="px-1">
              <AccountMenu />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const now = useNow(60_000)
  const section = sectionName(location.pathname)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-3 sm:px-5 lg:pr-5">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir navegación"
        >
          <MenuIcon className="size-4" aria-hidden="true" />
        </Button>
        <Link
          to="/inbox"
          className="flex items-center gap-2 rounded-md px-1 py-1 text-primary lg:hidden"
          aria-label="ByGrow Inbox"
        >
          <ByGrowMark className="h-6" />
          <span className="font-display text-[18px] font-bold tracking-[-0.04em]">bygrow</span>
        </Link>
        <div className="hidden items-center gap-2 text-[12px] text-muted-foreground lg:flex">
          <span className="inline-flex size-5 items-center justify-center rounded bg-sheet/70 text-primary">
            <InboxIcon className="size-3" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="font-medium text-foreground">{section}</span>
          <span className="text-border">/</span>
          <span>WhatsApp Business</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="hidden items-center gap-1.5 px-2 text-[11px] text-muted-foreground sm:flex"
          title={formatDate(now)}
        >
          <span className="size-1.5 rounded-full bg-brote" aria-hidden="true" />
          <span>Bogotá</span>
          <span className="num font-medium text-foreground">{formatTime(now)}</span>
        </span>
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
    </header>
  )
}

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-frame lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <DesktopSidebar />
      <MobileNavigation open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setMobileNavOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 flex-1 px-0 pb-0 outline-none lg:pr-2 lg:pb-2"
        >
          <div className="h-full min-h-0 overflow-hidden border-border bg-sheet lg:rounded-2xl lg:border">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
