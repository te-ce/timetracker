import type { LeaveType, MonthRepository } from '../../infra/repositories/types'
import type { DayType } from './dayType'
import { useDayStatusMutations } from '../settings/useDayTypeOverrideMutations'
import { isDayTypeOverride } from './dayType'

interface Props {
  date: string
  dayType: DayType
  halfDayLeave?: LeaveType | undefined
  repository: MonthRepository
}

const HALF_DAY_VALUES = ['HalfVacation', 'HalfSickDay'] as const
type HalfDayValue = (typeof HALF_DAY_VALUES)[number]

function isHalfDayValue(v: string): v is HalfDayValue {
  return HALF_DAY_VALUES.some((o) => o === v)
}

const HALF_DAY_LEAVE_TYPE: Record<HalfDayValue, LeaveType> = {
  HalfVacation: 'Vacation',
  HalfSickDay: 'SickDay',
}

const DAY_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'WorkDay' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'PublicHoliday', label: 'PublicHoliday' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'SickDay' },
  { value: 'HalfVacation', label: '½ Vacation' },
  { value: 'HalfSickDay', label: '½ Sick day' },
]

export function DayTypePicker({ date, dayType, halfDayLeave, repository }: Props) {
  const { save: saveMutation } = useDayStatusMutations(repository)

  function handleChange(value: string) {
    if (isHalfDayValue(value)) {
      saveMutation.mutate({ date, halfDayLeave: HALF_DAY_LEAVE_TYPE[value] })
    } else if (value === 'WorkDay' || value === 'Weekend') {
      saveMutation.mutate({ date })
    } else if (isDayTypeOverride(value)) {
      saveMutation.mutate({ date, dayTypeOverride: value })
    }
  }

  const currentValue = halfDayLeave && dayType === 'WorkDay' ? `Half${halfDayLeave}` : dayType

  return (
    <select
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border bg-transparent pl-3 pr-6 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
      aria-label="Day type"
    >
      {DAY_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
