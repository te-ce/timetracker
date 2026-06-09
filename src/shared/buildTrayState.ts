import type { WorkPeriod, WorkPeriodSubtask } from '../infra/repositories/types'
import type { TimeFormat } from './timeFormatStore'
import { formatHours } from './formatHours'

export interface ReceiptLine {
  label: string
  value: string
  isTotal?: boolean
}

export interface TrayStateInput {
  sollstunden: number
  priorOvertime: number
  workedHours: number
  trackingElapsed: number
  liveElapsed: number
  timeFormat: TimeFormat
  autoCategory: string | null
  categories: string[]
  windows: WorkPeriod[]
  isTracking: boolean
  startedAt: string | null
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

function buildBadgeLabel(remaining: number, fmt: TimeFormat): string {
  if (remaining > 0) return `${formatHours(remaining, fmt)} left`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime`
}

function buildReceiptLines(
  sollstunden: number,
  priorOvertime: number,
  workedHours: number,
  trackingElapsed: number,
  liveElapsed: number,
  fmt: TimeFormat,
): ReceiptLine[] {
  const remaining = sollstunden - priorOvertime - workedHours - trackingElapsed - liveElapsed
  const hasOvertime = priorOvertime >= 0
  const carrySign = hasOvertime ? '-' : '+'
  const carryLabel = hasOvertime ? 'Overtime carry-over' : 'Undertime carry-over'

  const lines: ReceiptLine[] = [
    { label: 'Target', value: formatHours(sollstunden, fmt) },
    { label: carryLabel, value: `${carrySign}${formatHours(Math.abs(priorOvertime), fmt)}` },
    { label: 'Worked today', value: `-${formatHours(workedHours, fmt)}` },
  ]

  if (trackingElapsed > 0) {
    lines.push({ label: 'Tracking', value: `-${formatHours(trackingElapsed, fmt)}` })
  }
  if (liveElapsed > 0) {
    lines.push({ label: 'Current tracking', value: `-${formatHours(liveElapsed, fmt)}` })
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
  const { sollstunden, priorOvertime, workedHours, trackingElapsed, liveElapsed, timeFormat } = input
  const remaining = sollstunden - priorOvertime - workedHours - trackingElapsed - liveElapsed

  const receiptLines = buildReceiptLines(
    sollstunden,
    priorOvertime,
    workedHours,
    trackingElapsed,
    liveElapsed,
    timeFormat,
  )
  const badgeLabel = buildBadgeLabel(remaining, timeFormat)
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
