import type { DisplayStatus } from '../../shared/statusColors'
import { DaySummaryBody } from '../../shared/DaySummaryBody'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import { useTimeFormatStore } from '../../shared/timeFormatStore'

export { LEAVE_TYPE_LABEL } from '../../shared/DaySummaryBody'

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'Work Day' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'Sick Day' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
]

export interface DotPopoverState extends DaySummaryData {
  date: string
  currentDayType: string
  top: number
  left: number
  displayStatus: DisplayStatus
}

interface DotPopoverPanelProps {
  state: DotPopoverState | null
  popoverRef: React.RefObject<HTMLDivElement | null>
  onSelectDayType: (value: string) => void
}

export function DotPopoverPanel({ state, popoverRef, onSelectDayType }: DotPopoverPanelProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  if (!state) return null
  return (
    <div
      ref={popoverRef}
      style={{ top: state.top, left: state.left }}
      className="fixed z-[300] w-56 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
    >
      <div className="mb-3">
        <DaySummaryBody {...state} timeFormat={timeFormat} dark={false} />
      </div>

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Day type
      </p>
      <div className="flex flex-wrap gap-1">
        {DAY_TYPE_OPTIONS.map((opt) => (
          <button
            type="button"
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
