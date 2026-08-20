import type { WorkLocation } from '../../infra/repositories/types'
import { type DaySummaryData } from '../../shared/DaySummaryBody'
import type { DayStatus } from '../../shared/dayStatus'
import { STATUS_CELL } from '../../shared/statusColors'
import type { DisplayStatus } from '../../shared/statusColors'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { Tooltip } from '../../shared/Tooltip'
import { buildDots } from './dayCellStatus'
import type { MonthOverviewDay } from './monthOverview'
import { DayLedger } from './DayLedger'
import { DayCellTooltipContent } from './DayCellTooltipContent'
import { DayCellBadges } from './DayCellBadges'

export interface DayCellProps {
  iso: string
  date: Date
  isToday: boolean
  status: DayStatus
  displayStatus: DisplayStatus | undefined
  summaryData: DaySummaryData | undefined
  note: string | undefined
  location: WorkLocation | undefined
  ledger: MonthOverviewDay | undefined
  timeFormat: TimeFormat
  onSelectDate: (isoDate: string) => void
}

interface DayCellVisualState {
  cellStatus: DisplayStatus | DayStatus
  isTodayCell: boolean
  todayRing: string
  showBar: boolean
}

// Today wears its real state rather than the neutral 'today' surface — otherwise a day with
// 6h logged looks exactly like one with nothing. The amber ring carries "this is today".
function computeDayCellVisualState(
  status: DayStatus,
  displayStatus: DisplayStatus | undefined,
  isToday: boolean,
): DayCellVisualState {
  const isTodayCell = isToday || status === 'today'
  return {
    cellStatus: isTodayCell ? (displayStatus ?? 'today') : status,
    isTodayCell,
    todayRing: isTodayCell ? ' ring-2 ring-inset ring-amber-500 dark:ring-amber-400' : '',
    showBar: status !== 'non-working' && status !== 'leave',
  }
}

export function DayCell({
  iso,
  date,
  isToday,
  status,
  displayStatus,
  summaryData,
  note,
  location,
  ledger,
  timeFormat,
  onSelectDate,
}: DayCellProps) {
  const label = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dots = buildDots(status, displayStatus)
  const { cellStatus, isTodayCell, todayRing, showBar } = computeDayCellVisualState(status, displayStatus, isToday)

  const hasTooltipContent = summaryData != null || note != null
  const tooltipContent = hasTooltipContent ? (
    <DayCellTooltipContent status={status} summaryData={summaryData} note={note} timeFormat={timeFormat} />
  ) : undefined

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        onClick={() => onSelectDate(iso)}
        aria-label={label}
        aria-current={isToday ? 'date' : undefined}
        className={`relative flex h-full min-h-[4.75rem] w-full flex-col gap-1 rounded-lg px-2 pb-3 pt-1.5 text-left text-sm ${STATUS_CELL[cellStatus]} border transition-colors${todayRing}`}
      >
        <span className="flex items-start justify-between">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold ${isToday ? 'bg-orange-400 text-white dark:bg-orange-500' : ''}`}
          >
            {date.getDate()}
          </span>
          <DayCellBadges isTodayCell={isTodayCell} note={note} location={location} />
        </span>

        {ledger && <DayLedger ledger={ledger} showBar={showBar} timeFormat={timeFormat} />}

        <span className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5" aria-hidden="true">
          {dots.map((cls, i) => (
            <span key={i} className={`h-1 w-1 rounded-full ${cls}`} />
          ))}
        </span>
      </button>
    </Tooltip>
  )
}
