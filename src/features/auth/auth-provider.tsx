import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { UNAUTHORIZED_EVENT, authApi } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'
import type { AuthUser, MeResponse } from '@/types/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [authOverride, setAuthOverride] = useState<AuthUser | null | undefined>(undefined)
  const lastExpiredNotice = useRef(0)

  const meQuery = useQuery<MeResponse>({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const user = authOverride === undefined ? (meQuery.data?.user ?? null) : authOverride
  const loading = authOverride === undefined && meQuery.isLoading

  useEffect(() => {
    function handleUnauthorized() {
      queryClient.clear()
      setAuthOverride(null)
      const now = Date.now()
      if (now - lastExpiredNotice.current > 2_000) {
        lastExpiredNotice.current = now
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.')
      }
      navigate('/login', { replace: true })
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [navigate, queryClient])

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const response = await authApi.login(email, password)
      queryClient.setQueryData<MeResponse>(queryKeys.me, { ok: true, user: response.user })
      setAuthOverride(response.user)
      return response.user
    },
    [queryClient],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout()
    } finally {
      queryClient.clear()
      setAuthOverride(null)
      navigate('/login', { replace: true })
    }
  }, [navigate, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
