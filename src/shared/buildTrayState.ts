import type { WorkPeriod, WorkPeriodSubtask } from '../infra/repositories/types'
import type { TimeFormat } from './timeFormatStore'
import { formatHours } from './formatHours'

export interface ReceiptLine {
  label: string
  value: string
  isTotal?: boolean
  isSubItem?: boolean
}

export interface TrayStateInput {
  sollstunden: number
  priorOvertime: number
  workedHours: number
  liveElapsed: number
  remaining: number
  timeFormat: TimeFormat
  autoCategory: string | null
  categories: string[]
  windows: WorkPeriod[]
  isTracking: boolean
  startedAt: string | null
  remainingTimeMode?: 'until-zero-overtime' | 'until-daily-target'
  showTotalWorked?: boolean
}

export interface TrayState {
  receiptLines: ReceiptLine[]
  badgeLabel: string
  autoCategory: string | null
  activeSubtaskCategory: string | null
  categories: string[]
  isTracking: boolean
  startedAt: string | null
}

function buildBadgeLabel(remaining: number, totalWorked: number, fmt: TimeFormat, showTotalWorked: boolean): string {
  if (showTotalWorked) return `${formatHours(totalWorked, fmt)} worked`
  if (remaining > 0) return `${formatHours(remaining, fmt)} left`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime`
}

function buildReceiptLines(
  sollstunden: number,
  priorOvertime: number,
  workedHours: number,
  liveElapsed: number,
  remaining: number,
  fmt: TimeFormat,
  remainingTimeMode?: 'until-zero-overtime' | 'until-daily-target',
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

function isLiveSubtask(s: WorkPeriodSubtask): boolean {
  return !!s.startedAt && !s.stoppedAt
}

function findOpenPeriod(windows: WorkPeriod[]): WorkPeriod | undefined {
  return windows.find((w) => w.end === null)
}

function findLiveSubtaskCategory(windows: WorkPeriod[]): string | null {
  const openPeriod = findOpenPeriod(windows)
  if (!openPeriod) return null
  const live = openPeriod.subtasks.find(isLiveSubtask)
  return live?.category ?? null
}

export function buildTrayState(input: TrayStateInput): TrayState {
  const { sollstunden, priorOvertime, workedHours, liveElapsed, remaining, timeFormat } = input
  const mode = input.remainingTimeMode ?? 'until-zero-overtime'
  const totalWorked = workedHours + liveElapsed

  const receiptLines = buildReceiptLines(
    sollstunden,
    priorOvertime,
    workedHours,
    liveElapsed,
    remaining,
    timeFormat,
    mode,
  )
  const badgeLabel = buildBadgeLabel(remaining, totalWorked, timeFormat, input.showTotalWorked === true)
  const activeSubtaskCategory = findLiveSubtaskCategory(input.windows)

  return {
    receiptLines,
    badgeLabel,
    autoCategory: input.autoCategory,
    activeSubtaskCategory,
    categories: input.categories,
    isTracking: input.isTracking,
    startedAt: input.startedAt,
  }
}
