import { useTimeFormatStore } from '../../../shared/timeFormatStore'

export function TimeFormatRow() {
  const { format, toggleFormat } = useTimeFormatStore()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium dark:text-gray-100">Time format</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">Show hours as decimal (7.5) or HH:MM (7:30).</p>
      </div>
      <button
        type="button"
        onClick={toggleFormat}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium tabular-nums text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {format === 'decimal' ? 'Decimal' : 'HH:MM'}
      </button>
    </div>
  )
}
