import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from './queryKeys'
import { fetchHolidays } from '../domain/holidays'
import type { Bundesland, PublicHoliday } from '../domain/holidays'

export function useHolidays(state: Bundesland | null, year: number) {
  return useQuery<PublicHoliday[]>({
    queryKey: QUERY_KEYS.holidays(state!, year),
    queryFn: () => fetchHolidays(state!, year),
    enabled: !!state,
    staleTime: 24 * 60 * 60 * 1000, // cache 24h
  })
}
