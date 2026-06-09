import { Fragment } from 'react'
import { toLocalIso } from '../../shared/dateUtils'
import type { DayStatus } from '../../shared/dayStatus'
import { STATUS_CELL, STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import type { DisplayStatus } from '../../shared/statusColors'
import { Tooltip } from '../../shared'
import { LEAVE_TYPE_LABEL } from '../day/DotPopoverPanel'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  dayStatusMap?: Record<string, DayStatus>
  dayDisplayStatusMap?: Record<string, DisplayStatus>
  dayStatusReasonMap?: Record<string, string>
  dayCategoryBreakdownMap?: Record<string, Record<string, number>>
  dayLeaveTypeMap?: Record<string, 'Vacation' | 'SickDay'>
  dayCategoryDescriptionsMap?: Record<string, string>
  dayNoteMap?: Record<string, string>
}

const STATUS_NAME: Record<DayStatus, string> = {
  ...STATUS_LABEL,
  today: 'Today',
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function buildTooltipContent(
  status: DayStatus,
  reason: string | undefined,
  workedHours: number,
  categoryBreakdown: Record<string, number>,
  categoryDescriptions: Record<string, string> | undefined,
  leaveType: 'Vacation' | 'SickDay' | undefined,
  note: string | undefined,
  timeFormat: TimeFormat,
): React.ReactNode {
  const hasCategories = Object.keys(categoryBreakdown).length > 0
  const hasContent = reason || note || workedHours > 0 || hasCategories
  if (!hasContent) return undefined

  const explanation = leaveType ? (LEAVE_TYPE_LABEL[leaveType] ?? null) : reason || null

  return (
    <div>
      <p className="font-semibold">{STATUS_NAME[status]}</p>
      {explanation && <p className="mt-0.5 text-gray-300">{explanation}</p>}
      {(workedHours > 0 || hasCategories) && (
        <div className="mt-1.5 border-t border-gray-600 pt-1.5">
          <p className="text-gray-300">{formatHoursCompact(workedHours, timeFormat)} total</p>
          <div className="mt-0.5 grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-gray-400">
            {Object.entries(categoryBreakdown).map(([cat, hours]) => {
              const desc = categoryDescriptions?.[cat]
              return (
                <Fragment key={cat}>
                  <span className="text-right tabular-nums">{formatHoursCompact(hours, timeFormat)}</span>
                  <span>
                    {cat}
                    {desc ? ` (${desc})` : ''}
                  </span>
                </Fragment>
              )
            })}
          </div>
        </div>
      )}
      {note && <p className="mt-1.5 border-t border-gray-600 pt-1.5 whitespace-pre-wrap text-gray-200">{note}</p>}
    </div>
  )
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
  dayStatusReasonMap = {},
  dayCategoryBreakdownMap = {},
  dayLeaveTypeMap = {},
  dayCategoryDescriptionsMap,
  dayNoteMap = {},
}: Props) {
  const days = getDaysInMonth(year, month)
  const now = new Date()
  const todayIso = toLocalIso(now)
  const timeFormat = useTimeFormatStore((s) => s.format)

  return (
    <div className="grid grid-cols-7 gap-1">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div key={d} className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {d}
        </div>
      ))}

      {Array.from({ length: ((days[0]?.getDay() ?? 0) + 6) % 7 }).map((_, i) => (
        <div key={`empty-${i}`} />
      ))}

      {days.map((date) => {
        const iso = toLocalIso(date)
        const status = dayStatusMap[iso] ?? 'future'
        const isToday = iso === todayIso
        const reason = dayStatusReasonMap[iso]
        const categoryBreakdown = dayCategoryBreakdownMap[iso] ?? {}
        const leaveType = dayLeaveTypeMap[iso]
        const workedHours = Object.values(categoryBreakdown).reduce((s, h) => s + h, 0)
        const note = dayNoteMap[iso]
        const label = date.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const displayStatus = dayDisplayStatusMap[iso]
        const dots = buildDots(status, displayStatus)
        const tooltipContent = buildTooltipContent(
          status,
          reason,
          workedHours,
          categoryBreakdown,
          dayCategoryDescriptionsMap,
          leaveType,
          note,
          timeFormat,
        )
        return (
          <div key={date.getDate()}>
            <Tooltip content={tooltipContent}>
              <button
                onClick={() => onSelectDate(iso)}
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
                className={`relative w-full rounded-lg px-2 pb-3 pt-2 text-center text-sm ${STATUS_CELL[status]} border transition-colors`}
              >
                <span
                  className={`relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full font-bold ${isToday ? 'bg-orange-400 text-white dark:bg-orange-500' : ''}`}
                >
                  {date.getDate()}
                </span>
                {displayStatus === 'confirmed' && (
                  <span
                    className="absolute top-0.5 right-1 text-[9px] font-bold leading-none text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
                <span className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5" aria-hidden="true">
                  {dots.map((cls, i) => (
                    <span key={i} className={`h-1 w-1 rounded-full ${cls}`} />
                  ))}
                </span>
              </button>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
