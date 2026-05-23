import { QUERY_KEYS } from '../hooks/queryKeys'
import { useQuery } from '@tanstack/react-query'
import type { DayTypeOverrideRepository } from '../repositories/types'
import { useDayTypeOverrideMutations } from '../hooks/useDayTypeOverrideMutations'
import { isDayTypeOverride } from '../domain/dayType'

interface Props {
  date: string
  repository: DayTypeOverrideRepository
}

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'WorkDay' },
  { value: 'PublicHoliday', label: 'PublicHoliday' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'SickDay' },
  { value: 'Absence', label: 'Absence' },
]

export function DayTypePicker({ date, repository }: Props) {
  const { data: override } = useQuery({
    queryKey: QUERY_KEYS.dayTypeOverrideByDate(date),
    queryFn: () => repository.findByDate(date),
  })

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
      className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
