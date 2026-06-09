import { Fragment } from 'react'
import type { DisplayStatus } from '../../shared/statusColors'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'Work Day' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'Sick Day' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
]

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  Vacation: 'Vacation',
  SickDay: 'Sick day',
}

export interface DotPopoverState {
  date: string
  currentDayType: string
  top: number
  left: number
  displayStatus: DisplayStatus
  reason: string
  workedHours: number
  categoryBreakdown: Record<string, number>
  categoryDescriptions?: Record<string, string>
  leaveType?: 'Vacation' | 'SickDay'
}

interface DotPopoverPanelProps {
  state: DotPopoverState | null
  popoverRef: React.RefObject<HTMLDivElement | null>
  onSelectDayType: (value: string) => void
}

export function DotPopoverPanel({ state, popoverRef, onSelectDayType }: DotPopoverPanelProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  if (!state) return null
  const explanation = state.leaveType ? (LEAVE_TYPE_LABEL[state.leaveType] ?? null) : state.reason || null
  const hasHours = state.workedHours > 0 || Object.keys(state.categoryBreakdown).length > 0
  return (
    <div
      ref={popoverRef}
      style={{ top: state.top, left: state.left }}
      className="fixed z-[300] w-56 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
    >
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[state.displayStatus]}`}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {STATUS_LABEL[state.displayStatus]}
          </span>
        </div>
        {explanation && <p className="mt-0.5 ml-4 text-xs text-gray-500 dark:text-gray-400">{explanation}</p>}
      </div>

      {hasHours && (
        <div className="mb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {formatHoursCompact(state.workedHours, timeFormat)} total
          </p>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            {Object.entries(state.categoryBreakdown).map(([cat, hours]) => {
              const desc = state.categoryDescriptions?.[cat]
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

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Day type
      </p>
      <div className="flex flex-wrap gap-1">
        {DAY_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelectDayType(opt.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              state.currentDayType === opt.value
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
