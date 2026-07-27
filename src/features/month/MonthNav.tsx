const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface Props {
  year: number
  month: number // 0-indexed
  onMonthChange?: (year: number, month: number) => void
  compact?: boolean
}

export function MonthNav({ year, month, onMonthChange, compact }: Props) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  function handlePrev() {
    if (!onMonthChange) return
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }

  function handleNext() {
    if (!onMonthChange) return
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  const navBtnClass = compact
    ? 'rounded border px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700'
    : 'rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700'

  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex items-center justify-between'}>
      <button type="button" aria-label="Previous month" onClick={handlePrev} className={navBtnClass}>
        ← Prev
      </button>
      <div className="flex items-center gap-2">
        <h2 className={compact ? 'text-sm font-medium' : 'text-lg font-semibold'}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          type="button"
          aria-label="Current month"
          onClick={() => onMonthChange?.(now.getFullYear(), now.getMonth())}
          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${isCurrentMonth ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}
          aria-disabled={isCurrentMonth}
        >
          Today
        </button>
      </div>
      <button type="button" aria-label="Next month" onClick={handleNext} className={navBtnClass}>
        Next →
      </button>
    </div>
  )
}
