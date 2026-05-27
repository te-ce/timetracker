import { useEffect } from 'react'
import { toLocalIso } from '../domain/dateUtils'
import { useDayQuery } from './useDayQuery'

export function useRemainingHours() {
  const todayIso = toLocalIso(new Date())
  const { sollstunden, workedHours, overtimeToDate } = useDayQuery(todayIso)
  const priorOvertime = overtimeToDate.priorOvertime
  const remaining = Math.max(0, sollstunden - workedHours)

  useEffect(() => {
    const label = remaining > 0 ? `(${remaining.toFixed(1)}h left) ` : ''
    document.title = `${label}Timetracker`

    if ('setAppBadge' in navigator) {
      if (remaining > 0) {
        void (navigator as Navigator & { setAppBadge(count?: number): Promise<void> }).setAppBadge(
          Math.ceil(remaining),
        )
      } else {
        void (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge()
      }
    }
  }, [remaining])

  return { remaining, sollstunden, workedHours, priorOvertime }
}
