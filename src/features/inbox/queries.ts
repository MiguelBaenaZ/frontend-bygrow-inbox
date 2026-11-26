import { useQuery } from '@tanstack/react-query'

import { chatsApi, inboxApi } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { ChatDetailResponse, ChatSummary, TemplateInfo } from '@/types/api'

function visiblePollingInterval(milliseconds: number) {
  return () => (document.visibilityState === 'visible' ? milliseconds : false)
}

export function useChatsQuery() {
  return useQuery<ChatSummary[]>({
    queryKey: queryKeys.chats,
    queryFn: async () => {
      const response = await chatsApi.list()
      return response.chats
    },
    refetchInterval: visiblePollingInterval(15_000),
    staleTime: 5_000,
  })
}

export function useChatQuery(chatId: string | undefined) {
  return useQuery<ChatDetailResponse>({
    queryKey: queryKeys.chat(chatId ?? ''),
    queryFn: () => chatsApi.get(chatId ?? ''),
    enabled: Boolean(chatId),
    refetchInterval: visiblePollingInterval(8_000),
    staleTime: 3_000,
  })
}

export function useTemplatesQuery(enabled: boolean) {
  return useQuery<TemplateInfo[]>({
    queryKey: queryKeys.templates,
    queryFn: async () => {
      const response = await inboxApi.listTemplates()
      return response.templates
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
