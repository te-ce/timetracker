import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DayTypeOverride, DayTypeOverrideRepository } from '../repositories/types'

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
  const queryClient = useQueryClient()

  const { data: override } = useQuery({
    queryKey: ['dayTypeOverride', date],
    queryFn: () => repository.findByDate(date),
  })

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      if (value === 'WorkDay') {
        await repository.delete(date)
      } else {
        await repository.save(date, value as DayTypeOverride)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dayTypeOverride'] })
      void queryClient.invalidateQueries({ queryKey: ['dayTypeOverrides'] })
    },
  })

  const currentValue = override ?? 'WorkDay'

  return (
    <select
      value={currentValue}
      onChange={(e) => saveMutation.mutate(e.target.value)}
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
