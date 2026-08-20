/**
 * The numbers behind the overtime bar, as data rather than markup.
 *
 * Split out so the bar and the badges that read the same figures can each be one
 * component per file.
 */
import type { DayBalance } from '../../shared/dayBalance'
import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'

export interface OfficeStats {
  officeDays: number
  totalWorkDays: number
  officePercent: number
}

export function formatRemaining(remaining: number, fmt: TimeFormat): string {
  if (remaining > 0) return `${formatHours(remaining, fmt)} remaining`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime today`
}

function formatResult(remaining: number, totalWorked: number, fmt: TimeFormat, showTotalWorked: boolean): string {
  if (showTotalWorked) return `${formatHours(totalWorked, fmt)} worked today`
  return formatRemaining(remaining, fmt)
}

export interface LoadingState {
  overtimeUnknown: boolean
  resultUnknown: boolean
  ariaLabel: string
}

/** Only requiredToday/remaining (and thus resultLabel) depend on the still-loading prior-months carry-over — see `calculateRemaining`. In 'until-daily-target' mode neither depends on it, so nothing is ever unknown there. */
export function deriveLoadingState(
  balance: DayBalance,
  isLoading: boolean,
  showTotalWorked: boolean,
  summary: string,
): LoadingState {
  const overtimeUnknown = isLoading && balance.remainingTimeMode !== 'until-daily-target'
  const resultUnknown = overtimeUnknown && !showTotalWorked
  const ariaLabel = overtimeUnknown ? 'Loading overtime…' : summary
  return { overtimeUnknown, resultUnknown, ariaLabel }
}

export interface BarData {
  resultLabel: string
  overtimeLabel: string
  overtimeSign: string
  overtimeClass: string
  summary: string
  resultClass: string
}

export function buildBarData(balance: DayBalance, fmt: TimeFormat, showTotalWorked: boolean): BarData {
  const { sollstunden, priorOvertime, closedWorked, liveElapsed, worked, remaining, requiredToday } = balance
  const hasOvertime = priorOvertime >= 0
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'

  const equationBreakdown =
    balance.remainingTimeMode === 'until-daily-target'
      ? ''
      : ` (${formatHours(sollstunden, fmt)} target ${overtimeSign} ${formatHours(Math.abs(priorOvertime), fmt)} ${overtimeLabel})`

  const workedBreakdownParts: string[] = []
  if (liveElapsed > 0) {
    if (closedWorked > 0) workedBreakdownParts.push(`${formatHours(closedWorked, fmt)} past`)
    workedBreakdownParts.push(`${formatHours(liveElapsed, fmt)} current`)
  }
  const workedBreakdown = workedBreakdownParts.length >= 2 ? ` (${workedBreakdownParts.join(' + ')})` : ''

  const projectedPart = balance.plannedStopTime ? `, projected at ${balance.plannedStopTime}` : ''

  const resultLabel = formatResult(remaining, worked, fmt, showTotalWorked)
  const summary = `${formatHours(requiredToday, fmt)} required${equationBreakdown}, ${formatHours(worked, fmt)} worked${workedBreakdown}${projectedPart} — ${resultLabel}`

  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
  return { resultLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass }
}
