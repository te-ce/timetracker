import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DayTypeOverride, LeaveType, MonthRepository } from '../../infra/repositories/types'
import { invalidateMonth } from '../../shared/queryKeys'

/** Sets a day's status (full-day override and/or half-day leave) in one atomic write; omitted fields are cleared. */
export function useDayStatusMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({
      date,
      dayTypeOverride,
      halfDayLeave,
    }: {
      date: string
      dayTypeOverride?: DayTypeOverride
      halfDayLeave?: LeaveType
    }) =>
      repository.updateDay(date, (day) => {
        const updated = { ...day }
        if (dayTypeOverride) updated.dayTypeOverride = dayTypeOverride
        else delete updated.dayTypeOverride
        if (halfDayLeave) updated.halfDayLeave = halfDayLeave
        else delete updated.halfDayLeave
        return updated
      }),
    onSuccess: (_, { date }) => invalidate(date),
  })

  return { save }
}
