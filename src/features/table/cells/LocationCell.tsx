import type { WorkLocation } from '../../../infra/repositories/types'

export function LocationCell({
  visible,
  date,
  workLocations,
  defaultWorkLocation,
  onCycleLocation,
}: {
  visible: boolean
  date: string
  workLocations: Map<string, WorkLocation>
  defaultWorkLocation: WorkLocation
  onCycleLocation: (date: string) => void
}) {
  if (!visible) return null
  const loc = workLocations.get(date) ?? defaultWorkLocation
  const locIcon = loc === 'Office' ? '🏢' : '🏠'
  return (
    <td className="w-6 border-l border-gray-200 px-1 py-0 text-center text-[10px] dark:border-gray-700" title={loc}>
      <button
        type="button"
        onClick={() => onCycleLocation(date)}
        className="w-full py-[3px] hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label={`Location ${date}`}
      >
        {locIcon}
      </button>
    </td>
  )
}
