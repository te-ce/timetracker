import type { WorkPeriod, WorkPeriodSubtask } from '../infra/repositories/types'
import type { TimeFormat } from './timeFormatStore'
import { buildReceipt, buildBadgeLabel, type ReceiptLine } from './remainingCalc'
import { findActivePeriod } from './worktime'

export type { ReceiptLine }

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
  nowHHMM: string
  remainingTimeMode?: 'until-zero-overtime' | 'until-daily-target'
  showTotalWorked?: boolean
  presentingMode?: boolean
}

export interface TrayState {
  receiptLines: ReceiptLine[]
  badgeLabel: string
  autoCategory: string | null
  activeSubtaskCategory: string | null
  categories: string[]
  isTracking: boolean
  startedAt: string | null
  presentingMode: boolean
}

function isLiveSubtask(s: WorkPeriodSubtask): boolean {
  return !!s.startedAt && !s.stoppedAt
}

function findLiveSubtaskCategory(windows: WorkPeriod[], nowHHMM: string): string | null {
  const activePeriod = findActivePeriod(windows, nowHHMM)
  if (!activePeriod) return null
  const live = activePeriod.subtasks.find(isLiveSubtask)
  return live?.category ?? activePeriod.category
}

export function buildTrayState(input: TrayStateInput): TrayState {
  const { sollstunden, priorOvertime, workedHours, liveElapsed, remaining, timeFormat } = input
  const mode = input.remainingTimeMode ?? 'until-zero-overtime'
  const totalWorked = workedHours + liveElapsed

  const activeSubtaskCategory = findLiveSubtaskCategory(input.windows, input.nowHHMM)
  const presentingMode = input.presentingMode === true

  if (presentingMode) {
    return {
      receiptLines: [],
      badgeLabel: '',
      autoCategory: input.autoCategory,
      activeSubtaskCategory,
      categories: input.categories,
      isTracking: input.isTracking,
      startedAt: input.startedAt,
      presentingMode,
    }
  }

  const receiptLines = buildReceipt(sollstunden, priorOvertime, workedHours, liveElapsed, remaining, timeFormat, mode)
  const badgeLabel = buildBadgeLabel(remaining, totalWorked, timeFormat, input.showTotalWorked === true)

  return {
    receiptLines,
    badgeLabel,
    autoCategory: input.autoCategory,
    activeSubtaskCategory,
    categories: input.categories,
    isTracking: input.isTracking,
    startedAt: input.startedAt,
    presentingMode,
  }
}
