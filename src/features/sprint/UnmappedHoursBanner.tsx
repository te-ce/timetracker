import { formatHours } from '../../shared/formatHours'

export interface UnmappedHoursItem {
  label: string
  hours: number
}

export function UnmappedHoursBanner({ items }: { items: UnmappedHoursItem[] }) {
  return (
    <div
      role="status"
      className="basis-full rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    >
      <p className="font-medium">These categories are not mapped to a Task ID, so their hours will not be exported:</p>
      <ul className="mt-1 list-disc pl-5">
        {items.map((item) => (
          <li key={item.label}>
            {item.label}: {formatHours(item.hours, 'decimal')}
          </li>
        ))}
      </ul>
    </div>
  )
}
