export function ClearCell({ date, onClearDay }: { date: string; onClearDay?: ((date: string) => void) | undefined }) {
  if (!onClearDay) return null
  return (
    <td className="w-8 text-center border-l border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onClearDay(date)}
        className="w-full py-[3px] text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded"
        aria-label={`Clear ${date}`}
        data-tooltip="Clear all data for this day"
      >
        ×
      </button>
    </td>
  )
}
