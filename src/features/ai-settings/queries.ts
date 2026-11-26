import { useQuery } from '@tanstack/react-query'

import { aiSettingsApi } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { AiSettingsHistoryEntry, AiSettingsResponse } from '@/types/api'

export function useAiSettingsQuery() {
  return useQuery<AiSettingsResponse>({
    queryKey: queryKeys.aiSettings,
    queryFn: aiSettingsApi.get,
    // Cada entrada a la pantalla debe leer la configuración vigente, no una
    // copia vieja de la caché.
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })
}

export function useAiSettingsHistoryQuery(enabled: boolean) {
  return useQuery<AiSettingsHistoryEntry[]>({
    queryKey: queryKeys.aiSettingsHistory,
    queryFn: async () => {
      const response = await aiSettingsApi.history()
      return response.versions
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
