import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import { WEEKDAY_ORDER_MON_SUN, type WeekdayHours } from '../../shared/weekdayHours'
import type { ConfigRepository } from '../../infra/repositories/types'
import { requireConfig } from '../../shared/appConfigDefaults'
import { DayHoursInput } from './DayHoursInput'

interface Props {
  repository: ConfigRepository
}

export function WeeklyScheduleSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (weekdayHours: WeekdayHours) => repository.save({ ...requireConfig(config), weekdayHours }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const weekdayHours = config.weekdayHours

  const handleSave = (dayIndex: number, hours: number) => {
    const updated: WeekdayHours = [...weekdayHours]
    updated[dayIndex] = hours
    mutation.mutate(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Target hours per day</h3>
      <div className="grid grid-cols-7 gap-2 max-w-md">
        {WEEKDAY_ORDER_MON_SUN.map((dayIndex) => (
          <DayHoursInput
            key={dayIndex}
            dayIndex={dayIndex}
            hours={weekdayHours[dayIndex]}
            onSave={(h) => handleSave(dayIndex, h)}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Set 0 for non-working days.</p>
    </div>
  )
}
