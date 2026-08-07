import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import { WEEKDAY_ORDER_MON_SUN, type WeekdayHours } from '../../shared/weekdayHours'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const DAY_LABELS_SHORT: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

interface DayInputProps {
  dayIndex: number
  hours: number
  onSave: (hours: number) => void
}

function DayHoursInput({ dayIndex, hours, onSave }: DayInputProps) {
  const [localValue, setLocalValue] = useState(String(hours))
  const label = DAY_LABELS[dayIndex] ?? String(dayIndex)
  const shortLabel = DAY_LABELS_SHORT[dayIndex] ?? String(dayIndex)
  const inputId = `weekday-hours-${dayIndex}`

  const handleBlur = () => {
    const val = parseFloat(localValue)
    if (!isNaN(val) && val >= 0 && val <= 24) {
      onSave(val)
    } else {
      setLocalValue(String(hours))
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {shortLabel}
      </label>
      <input
        id={inputId}
        aria-label={label}
        type="number"
        min={0}
        max={24}
        step={0.5}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-full rounded border px-1 py-1.5 text-center text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
      />
    </div>
  )
}

export function WeeklyScheduleSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (weekdayHours: WeekdayHours) => repository.save({ ...config!, weekdayHours }),
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
