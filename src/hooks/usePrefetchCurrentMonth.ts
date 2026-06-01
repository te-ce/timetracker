import { useQuery } from '@tanstack/react-query'
import { monthRepo } from '../repositories/shared'
import { QUERY_KEYS } from './queryKeys'

export function usePrefetchCurrentMonth() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })
}
