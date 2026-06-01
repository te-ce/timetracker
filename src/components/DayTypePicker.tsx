import type { MonthRepository, DayTypeOverride } from '../repositories/types'
import { useDayTypeOverrideMutations } from '../hooks/useDayTypeOverrideMutations'
import { isDayTypeOverride } from '../domain/dayType'

interface Props {
  date: string
  override: DayTypeOverride | undefined
  repository: MonthRepository
}

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'WorkDay' },
  { value: 'PublicHoliday', label: 'PublicHoliday' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'SickDay' },
  { value: 'Absence', label: 'Absence' },
]

export function DayTypePicker({ date, override, repository }: Props) {
  const { save: saveMutation, remove: removeMutation } = useDayTypeOverrideMutations(repository)

  function handleChange(value: string) {
    if (value === 'WorkDay') {
      removeMutation.mutate(date)
    } else if (isDayTypeOverride(value)) {
      saveMutation.mutate({ date, dayType: value })
    }
  }

  const currentValue = override ?? 'WorkDay'

  return (
    <select
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
      aria-label="Day type"
    >
      {DAY_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
