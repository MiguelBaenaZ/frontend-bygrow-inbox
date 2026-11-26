import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LoginPage } from '@/features/auth/login-page'
import { AuthContext } from '@/features/auth/auth-context'
import { ThemeContext } from '@/features/theme/theme-context'
import type { AuthUser } from '@/types/api'

const user: AuthUser = { id: 'user-1', email: 'admin@bygrow.co', role: 'admin' }

function renderLogin(login = vi.fn().mockResolvedValue(user)) {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <ThemeContext.Provider
        value={{ theme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() }}
      >
        <AuthContext.Provider
          value={{ user: null, loading: false, login, logout: vi.fn() }}
        >
          <LoginPage />
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </MemoryRouter>,
  )
  return { login }
}

describe('LoginPage', () => {
  it('muestra la validación local antes de llamar a la API', async () => {
    const { login } = renderLogin()
    const browser = userEvent.setup()

    await browser.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Escribe un correo válido')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('envía correo y contraseña al autenticarse', async () => {
    const { login } = renderLogin()
    const browser = userEvent.setup()

    await browser.type(screen.getByLabelText('Correo'), 'admin@bygrow.co')
    await browser.type(screen.getByLabelText('Contraseña'), 'clave-segura-123')
    await browser.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(login).toHaveBeenCalledWith('admin@bygrow.co', 'clave-segura-123')
  })
})
