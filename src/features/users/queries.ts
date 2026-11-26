import { useQuery } from '@tanstack/react-query'

import { usersApi } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { PublicUser } from '@/types/api'

export function useUsersQuery() {
  return useQuery<PublicUser[]>({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const response = await usersApi.list()
      return response.users
    },
    staleTime: 30_000,
  })
}
