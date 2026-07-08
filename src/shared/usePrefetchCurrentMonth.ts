import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { QUERY_KEYS } from './queryKeys'

export function usePrefetchCurrentMonth() {
  const { monthRepo } = useRepositories()
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const { isPending, isError } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  return { isPending, isError, year, month }
}
