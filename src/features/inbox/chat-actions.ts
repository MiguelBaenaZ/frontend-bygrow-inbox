import { useMutation, useQueryClient } from '@tanstack/react-query'

import { inboxApi } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  ChatDetailResponse,
  ConversationMeta,
  HandoffResponse,
  LeadStage,
  OptInResponse,
  StageResponse,
} from '@/types/api'

function mergeMeta(
  current: ChatDetailResponse | undefined,
  meta: ConversationMeta,
  status = meta.status,
): ChatDetailResponse | undefined {
  if (!current) return current
  return { ...current, status, meta }
}

export type ChatActions = ReturnType<typeof useChatActions>

export function useChatActions(chatId: string | undefined) {
  const queryClient = useQueryClient()

  function invalidate() {
    if (!chatId) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.chats })
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) })
  }

  const handoff = useMutation<HandoffResponse, Error, 'pause' | 'resume'>({
    mutationFn: (action) => inboxApi.handoff(chatId ?? '', action),
    onSuccess: (response) => {
      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId ?? ''), (current) =>
        current
          ? {
              ...current,
              status: response.status,
              meta: { ...current.meta, status: response.status },
            }
          : current,
      )
      invalidate()
    },
  })

  const stage = useMutation<StageResponse, Error, LeadStage>({
    mutationFn: (value) => inboxApi.setStage(chatId ?? '', value),
    onSuccess: (response) => {
      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId ?? ''), (current) =>
        mergeMeta(current, response.meta),
      )
      invalidate()
    },
  })

  const optIn = useMutation<
    OptInResponse,
    Error,
    { optIn?: boolean; optOut?: boolean }
  >({
    mutationFn: (values) => inboxApi.setOptIn(chatId ?? '', values),
    onSuccess: (response) => {
      queryClient.setQueryData<ChatDetailResponse>(queryKeys.chat(chatId ?? ''), (current) =>
        mergeMeta(current, response.meta),
      )
      invalidate()
    },
  })

  return { handoff, stage, optIn }
}
