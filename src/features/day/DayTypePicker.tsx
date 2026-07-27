import type { MonthRepository } from '../../infra/repositories/types'
import type { DayType } from './dayType'
import { useDayTypeOverrideMutations } from '../settings/useDayTypeOverrideMutations'
import { isDayTypeOverride } from './dayType'

interface Props {
  date: string
  dayType: DayType
  repository: MonthRepository
}

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'WorkDay' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'PublicHoliday', label: 'PublicHoliday' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'SickDay' },
]

export function DayTypePicker({ date, dayType, repository }: Props) {
  const { save: saveMutation, remove: removeMutation } = useDayTypeOverrideMutations(repository)

  function handleChange(value: string) {
    if (value === 'WorkDay' || value === 'Weekend') {
      removeMutation.mutate(date)
    } else if (isDayTypeOverride(value)) {
      saveMutation.mutate({ date, dayType: value })
    }
  }

  const currentValue = dayType

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
