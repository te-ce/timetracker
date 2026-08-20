import { useTimeFormatStore } from '../../shared/timeFormatStore'

export function TimeFormatToggle() {
  const { format, toggleFormat } = useTimeFormatStore()
  return (
    <button
      type="button"
      onClick={toggleFormat}
      aria-label={format === 'decimal' ? 'Switch to HH:MM format' : 'Switch to decimal format'}
      data-tooltip={format === 'decimal' ? 'Switch to HH:MM format' : 'Switch to decimal format'}
      className="tooltip-below rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs font-medium tabular-nums text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      {format === 'decimal' ? 'Dec.' : 'HH:MM'}
    </button>
  )
}
