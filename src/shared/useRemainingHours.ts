import { useEffect } from 'react'
import { toLocalIso } from './dateUtils'
import { useDayQuery } from '../features/day/useDayQuery'
import { formatHours } from './formatHours'

function buildSummary(sollstunden: number, priorOvertime: number, workedHours: number): string {
  const hasOvertime = priorOvertime >= 0
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const remaining = sollstunden - priorOvertime - workedHours
  let remainingLabel: string
  if (remaining > 0) remainingLabel = `${formatHours(remaining, 'decimal')} remaining`
  else if (remaining === 0) remainingLabel = 'Done'
  else remainingLabel = `${formatHours(Math.abs(remaining), 'decimal')} overtime today`
  return `${formatHours(sollstunden, 'decimal')} target, ${formatHours(Math.abs(priorOvertime), 'decimal')} ${overtimeLabel} carry-over, ${formatHours(workedHours, 'decimal')} worked today — ${remainingLabel}`
}

export function useRemainingHours() {
  const todayIso = toLocalIso(new Date())
  const { sollstunden, workedHours, overtimeToDate, officeDays, totalWorkDays, officePercent } = useDayQuery(todayIso)
  const priorOvertime = overtimeToDate.priorOvertime
  const remaining = sollstunden - priorOvertime - workedHours
  const summary = buildSummary(sollstunden, priorOvertime, workedHours)

  useEffect(() => {
    const label = remaining > 0 ? `(${remaining.toFixed(1)}h left) ` : ''
    document.title = `${label}Timetracker`
  }, [remaining])

  return { remaining, sollstunden, workedHours, priorOvertime, summary, officeDays, totalWorkDays, officePercent }
}
