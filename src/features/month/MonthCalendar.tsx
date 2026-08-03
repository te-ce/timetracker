import { toLocalIso } from '../../shared/dateUtils'
import { useTodayIso } from '../../shared/useTodayIso'
import type { DayStatus } from '../../shared/dayStatus'
import { STATUS_CELL, STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import type { DisplayStatus } from '../../shared/statusColors'
import { Tooltip } from '../../shared/Tooltip'
import { DaySummaryBody, LEAVE_TYPE_LABEL } from '../../shared/DaySummaryBody'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSignedHours } from './monthBalanceFormat'
import { isoWeekOf } from './monthOverview'
import type { MonthOverview, MonthOverviewDay, MonthOverviewWeek } from './monthOverview'
import type { WorkLocation } from '../../infra/repositories/types'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  dayStatusMap?: Record<string, DayStatus>
  dayDisplayStatusMap?: Record<string, DisplayStatus>
  daySummaryDataMap?: Record<string, DaySummaryData>
  dayNoteMap?: Record<string, string>
  dayLocationMap?: Record<string, WorkLocation>
  /** Hours, target and balance per day plus week totals — the numbers shown in the cells. */
  overview?: MonthOverview
}

const STATUS_NAME: Record<DayStatus, string> = {
  ...STATUS_LABEL,
  today: 'Today',
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

/** Calendar rows, Monday-aligned — the first row is padded out to the 1st's weekday. */
function toCalendarRows(days: Date[]): Date[][] {
  const rows: Date[][] = []
  let row: Date[] = []
  for (const date of days) {
    if (row.length > 0 && (date.getDay() + 6) % 7 === 0) {
      rows.push(row)
      row = []
    }
    row.push(date)
  }
  if (row.length > 0) rows.push(row)
  return rows
}

function buildDots(status: DayStatus, displayStatus: DisplayStatus | undefined): string[] {
  if (status === 'today') {
    return displayStatus ? [STATUS_DOT[displayStatus]] : []
  }
  return [STATUS_DOT[status]]
}

export function MonthCalendar({
  year,
  month,
  onSelectDate,
  dayStatusMap = {},
  dayDisplayStatusMap = {},
  daySummaryDataMap = {},
  dayNoteMap = {},
  dayLocationMap = {},
  overview,
}: Props) {
  const rows = toCalendarRows(getDaysInMonth(year, month))
  const todayIso = useTodayIso()
  const timeFormat = useTimeFormatStore((s) => s.format)

  const ledgerByDate = new Map<string, MonthOverviewDay>()
  const weekByIsoWeek = new Map<number, MonthOverviewWeek>()
  for (const week of overview?.weeks ?? []) {
    weekByIsoWeek.set(week.isoWeek, week)
    for (const day of week.days) ledgerByDate.set(day.date, day)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-8 gap-1">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
        <div className="py-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500">Week</div>
      </div>

      {rows.map((row) => {
        const firstDate = row[0]
        if (!firstDate) return null
        const leadingPad = (firstDate.getDay() + 6) % 7
        const week = weekByIsoWeek.get(isoWeekOf(toLocalIso(firstDate)))

        return (
          <div key={toLocalIso(firstDate)} className="grid grid-cols-8 gap-1">
            {Array.from({ length: leadingPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {row.map((date) => {
              const iso = toLocalIso(date)
              return (
                <DayCell
                  key={iso}
                  iso={iso}
                  date={date}
                  isToday={iso === todayIso}
                  status={dayStatusMap[iso] ?? 'future'}
                  displayStatus={dayDisplayStatusMap[iso]}
                  summaryData={daySummaryDataMap[iso]}
                  note={dayNoteMap[iso]}
                  location={dayLocationMap[iso]}
                  ledger={ledgerByDate.get(iso)}
                  timeFormat={timeFormat}
                  onSelectDate={onSelectDate}
                />
              )
            })}

            {Array.from({ length: 7 - leadingPad - row.length }).map((_, i) => (
              <div key={`tail-${i}`} />
            ))}

            {week ? <WeekTotalCell week={week} timeFormat={timeFormat} /> : <div />}
          </div>
        )
      })}
    </div>
  )
}

function WeekTotalCell({ week, timeFormat }: { week: MonthOverviewWeek; timeFormat: TimeFormat }) {
  return (
    <div className="flex flex-col justify-center rounded-lg border border-dashed px-2 py-1.5 text-right dark:border-gray-700">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">KW {week.isoWeek}</p>
      {!week.isFuture && (
        <>
          <p className="text-sm font-semibold tabular-nums">{formatHours(week.worked, timeFormat)}</p>
          <p className={`text-xs tabular-nums ${balanceInk(week.balance)}`}>
            {formatSignedHours(week.balance, timeFormat)}
          </p>
        </>
      )}
    </div>
  )
}

function DayLedger({
  ledger,
  showBar,
  timeFormat,
}: {
  ledger: MonthOverviewDay
  showBar: boolean
  timeFormat: TimeFormat
}) {
  return (
    <span className="block">
      {ledger.leaveType && ledger.workedHours === 0 ? (
        <span className="block text-xs font-medium leading-none">{LEAVE_TYPE_LABEL[ledger.leaveType]}</span>
      ) : (
        <span className="block text-base font-semibold leading-none tabular-nums">
          {ledger.workedHours > 0 ? formatHours(ledger.workedHours, timeFormat) : ''}
        </span>
      )}
      {showBar && ledger.targetHours > 0 && (
        <span className="mt-1 block h-1 w-full rounded-full bg-black/10 dark:bg-white/10">
          <span
            className="block h-1 rounded-full bg-indigo-500"
            style={{ width: `${ledger.fillPercent}%` }}
            aria-hidden="true"
          />
        </span>
      )}
      {ledger.balance !== null && (
        <span className={`mt-0.5 block text-[10px] leading-none tabular-nums ${balanceInk(ledger.balance)}`}>
          {formatSignedHours(ledger.balance, timeFormat)}
        </span>
      )}
    </span>
  )
}

interface DayCellProps {
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

function DayCell({
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
  const showBar = status !== 'non-working' && status !== 'leave'
  const isTodayCell = isToday || status === 'today'
  // Today wears its real state rather than the neutral 'today' surface — otherwise a day with
  // 6h logged looks exactly like one with nothing. The amber ring carries "this is today".
  const cellStatus = isTodayCell ? (displayStatus ?? 'today') : status
  const todayRing = isTodayCell ? ' ring-2 ring-inset ring-amber-500 dark:ring-amber-400' : ''

  const hasTooltipContent = summaryData != null || note != null
  const tooltipContent = hasTooltipContent ? (
    <div>
      {summaryData ? (
        <DaySummaryBody {...summaryData} timeFormat={timeFormat} dark />
      ) : (
        <p className="font-semibold">{STATUS_NAME[status]}</p>
      )}
      {note && <p className="mt-1.5 border-t border-gray-600 pt-1.5 whitespace-pre-wrap text-gray-200">{note}</p>}
    </div>
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
          <span className="flex items-center gap-1 pt-0.5 text-[10px] leading-none" aria-hidden="true">
            {isTodayCell && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Today
              </span>
            )}
            {note && <span>✎</span>}
            {location === 'Office' && <span>⌂</span>}
            {displayStatus === 'confirmed' && (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">✓</span>
            )}
          </span>
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
