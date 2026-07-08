import type { TimeFormat } from './timeFormatStore'
import { formatHours } from './formatHours'

export type RemainingTimeMode = 'until-zero-overtime' | 'until-daily-target'

export interface RemainingCalcInput {
  sollstunden: number
  priorOvertime: number
  workedHours: number
  /**
   * Full projected worked hours, including the still-to-come portion of a planned-stop
   * period. Defaults to `workedHours` (no projection) when omitted. Ignored while
   * `isPlannedStopMode` is true, since that branch counts down instead.
   */
  projectedWorkedHours?: number | undefined
  remainingTimeMode: RemainingTimeMode
  isPlannedStopMode: boolean
  countdownHours: number
}

export interface RemainingCalcResult {
  remaining: number
  requiredToday: number
}

export function calculateRemaining(input: RemainingCalcInput): RemainingCalcResult {
  const { sollstunden, priorOvertime, workedHours, remainingTimeMode, isPlannedStopMode, countdownHours } = input
  const effectiveWorkedHours = input.projectedWorkedHours ?? workedHours
  const requiredToday = remainingTimeMode === 'until-daily-target' ? sollstunden : sollstunden - priorOvertime
  const remaining = isPlannedStopMode
    ? countdownHours
    : remainingTimeMode === 'until-daily-target'
      ? sollstunden - effectiveWorkedHours
      : sollstunden - priorOvertime - effectiveWorkedHours
  return { remaining, requiredToday }
}

export interface ReceiptLine {
  label: string
  value: string
  isTotal?: boolean
  isSubItem?: boolean
}

export function buildReceipt(
  sollstunden: number,
  priorOvertime: number,
  workedHours: number,
  liveElapsed: number,
  remaining: number,
  fmt: TimeFormat,
  remainingTimeMode?: RemainingTimeMode,
): ReceiptLine[] {
  const requiredToday = remainingTimeMode === 'until-daily-target' ? sollstunden : sollstunden - priorOvertime
  const totalWorked = workedHours + liveElapsed
  const hasOvertime = priorOvertime >= 0
  const carrySign = hasOvertime ? '-' : '+'
  const carryLabel = hasOvertime ? 'Overtime carry-over' : 'Undertime carry-over'

  const lines: ReceiptLine[] = [
    { label: 'Required', value: formatHours(requiredToday, fmt) },
    { label: 'Target', value: formatHours(sollstunden, fmt), isSubItem: true },
    { label: carryLabel, value: `${carrySign}${formatHours(Math.abs(priorOvertime), fmt)}`, isSubItem: true },
    { label: 'Worked', value: `-${formatHours(totalWorked, fmt)}` },
    { label: 'Past', value: formatHours(workedHours, fmt), isSubItem: true },
  ]

  if (liveElapsed > 0) {
    lines.push({ label: 'Current', value: formatHours(liveElapsed, fmt), isSubItem: true })
  }

  if (remaining > 0) {
    lines.push({ label: 'Remaining', value: formatHours(remaining, fmt), isTotal: true })
  } else if (remaining === 0) {
    lines.push({ label: 'Done', value: '', isTotal: true })
  } else {
    lines.push({ label: 'Overtime', value: formatHours(Math.abs(remaining), fmt), isTotal: true })
  }

  return lines
}

export function buildBadgeLabel(
  remaining: number,
  totalWorked: number,
  fmt: TimeFormat,
  showTotalWorked: boolean,
): string {
  if (showTotalWorked) return `${formatHours(totalWorked, fmt)} worked`
  if (remaining > 0) return `${formatHours(remaining, fmt)} left`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime`
}
