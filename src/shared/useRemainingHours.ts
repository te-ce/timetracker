import { useEffect } from 'react'
import { toLocalIso } from './dateUtils'
import { useDayQuery } from '../features/day/useDayQuery'

export function useRemainingHours() {
  const todayIso = toLocalIso(new Date())
  const { sollstunden, workedHours, overtimeToDate } = useDayQuery(todayIso)
  const priorOvertime = overtimeToDate.priorOvertime
  const remaining = Math.max(0, sollstunden - workedHours)

  useEffect(() => {
    const label = remaining > 0 ? `(${remaining.toFixed(1)}h left) ` : ''
    document.title = `${label}Timetracker`
  }, [remaining])

  return { remaining, sollstunden, workedHours, priorOvertime }
}
