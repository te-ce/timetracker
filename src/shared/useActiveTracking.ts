import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { QUERY_KEYS } from './queryKeys'
import type { ActiveTracking } from '../infra/repositories/types'

export function useActiveTracking(): ActiveTracking | null {
  const { timeTrackingRepo } = useRepositories()
  const { data = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
  })
  return data
}
