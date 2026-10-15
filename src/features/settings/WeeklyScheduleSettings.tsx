import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import { WEEKDAY_ORDER_MON_SUN, type WeekdayHours } from '../../shared/weekdayHours'
import type { ConfigRepository } from '../../infra/repositories/types'
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
    mutationFn: ({ dayIndex, hours }: { dayIndex: number; hours: number }) =>
      repository.update((latest) => {
        const weekdayHours: WeekdayHours = [...latest.weekdayHours]
        weekdayHours[dayIndex] = hours
        return { weekdayHours }
      }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const weekdayHours = config.weekdayHours

  const handleSave = (dayIndex: number, hours: number) => {
    mutation.mutate({ dayIndex, hours })
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
