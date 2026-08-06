import type { LeaveType, MonthRepository } from '../../infra/repositories/types'
import type { DayType } from './dayType'
import { useDayTypeOverrideMutations, useHalfDayLeaveMutations } from '../settings/useDayTypeOverrideMutations'
import { isDayTypeOverride } from './dayType'

interface Props {
  date: string
  dayType: DayType
  halfDayLeave?: LeaveType | undefined
  repository: MonthRepository
}

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'WorkDay' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'PublicHoliday', label: 'PublicHoliday' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'SickDay' },
]

const HALF_DAY_OPTIONS: Array<{ value: LeaveType; label: string }> = [
  { value: 'Vacation', label: '½ Vacation' },
  { value: 'SickDay', label: '½ Sick day' },
]

export function DayTypePicker({ date, dayType, halfDayLeave, repository }: Props) {
  const { save: saveMutation, remove: removeMutation } = useDayTypeOverrideMutations(repository)
  const { save: saveHalfDay, remove: removeHalfDay } = useHalfDayLeaveMutations(repository)

  function handleChange(value: string) {
    if (value === 'WorkDay' || value === 'Weekend') {
      removeMutation.mutate(date)
    } else if (isDayTypeOverride(value)) {
      saveMutation.mutate({ date, dayType: value })
    }
  }

  function handleHalfDayChange(value: LeaveType) {
    if (halfDayLeave === value) {
      removeHalfDay.mutate(date)
    } else {
      saveHalfDay.mutate({ date, leaveType: value })
    }
  }

  const currentValue = dayType

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border bg-transparent pl-3 pr-6 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        aria-label="Day type"
      >
        {DAY_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {dayType === 'WorkDay' && (
        <div className="flex items-center gap-1" role="group" aria-label="Half-day leave">
          {HALF_DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleHalfDayChange(opt.value)}
              aria-pressed={halfDayLeave === opt.value}
              className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
                halfDayLeave === opt.value
                  ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
