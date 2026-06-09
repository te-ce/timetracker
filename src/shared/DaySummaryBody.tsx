import { Fragment } from 'react'
import type { DisplayStatus } from './statusColors'
import { STATUS_DOT, STATUS_LABEL } from './statusColors'
import type { TimeFormat } from './timeFormatStore'
import { formatHoursCompact } from './formatHours'

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  Vacation: 'Vacation',
  SickDay: 'Sick day',
}

export interface DaySummaryData {
  displayStatus: DisplayStatus
  reason: string
  workedHours: number
  categoryBreakdown: Record<string, number>
  categoryDescriptions?: Record<string, string>
  leaveType?: 'Vacation' | 'SickDay'
  note?: string
}

interface DaySummaryBodyProps extends DaySummaryData {
  timeFormat: TimeFormat
  /** true = render for dark tooltip background; false = render for light panel */
  dark?: boolean
}

export function DaySummaryBody({
  displayStatus,
  reason,
  workedHours,
  categoryBreakdown,
  categoryDescriptions,
  leaveType,
  note,
  timeFormat,
  dark = false,
}: DaySummaryBodyProps) {
  const explanation = leaveType ? (LEAVE_TYPE_LABEL[leaveType] ?? null) : reason || null
  const hasHours = workedHours > 0 || Object.keys(categoryBreakdown).length > 0

  const labelCls = dark ? 'font-semibold' : 'text-sm font-semibold text-gray-800 dark:text-gray-200'
  const explanationCls = dark ? 'mt-0.5 ml-4 text-gray-300' : 'mt-0.5 ml-4 text-xs text-gray-500 dark:text-gray-400'
  const dividerCls = dark
    ? 'mt-1.5 border-t border-gray-600 pt-1.5'
    : 'mb-3 border-t border-gray-100 dark:border-gray-700 pt-2'
  const totalCls = dark ? 'text-gray-300 mb-0.5' : 'text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'
  const gridCls = dark
    ? 'grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-gray-400'
    : 'grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400'
  const noteCls = dark
    ? 'mt-1.5 border-t border-gray-600 pt-1.5 whitespace-pre-wrap text-gray-200'
    : 'mt-1.5 border-t border-gray-100 dark:border-gray-700 pt-1.5 text-xs whitespace-pre-wrap text-gray-500 dark:text-gray-400'

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[displayStatus]}`}
          aria-hidden="true"
        />
        <span className={labelCls}>{STATUS_LABEL[displayStatus]}</span>
      </div>
      {explanation && <p className={explanationCls}>{explanation}</p>}

      {hasHours && (
        <div className={dividerCls}>
          <p className={totalCls}>{formatHoursCompact(workedHours, timeFormat)} total</p>
          <div className={gridCls}>
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

      {note && <p className={noteCls}>{note}</p>}
    </div>
  )
}
