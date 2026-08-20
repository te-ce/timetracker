export function ClearColumnHeader({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <th
      className="px-1 py-1 text-center w-8 border-b border-l border-gray-200 dark:border-gray-700"
      data-tooltip="Clear all data for this day"
    >
      <span className="sr-only">Clear day</span>
    </th>
  )
}
