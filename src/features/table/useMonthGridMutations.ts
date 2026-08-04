import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthData, MonthRepository, WorkLocation } from '../../infra/repositories/types'
import { isDayTypeOverride } from '../day/dayType'
import { invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { useUndoStore } from '../../shared/undoStore'

export function calendarBaseDayType(date: string): 'WorkDay' | 'Weekend' {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return dow === 0 || dow === 6 ? 'Weekend' : 'WorkDay'
}

function saveDayTypeInRepo(repository: MonthRepository, date: string, value: string): Promise<void> {
  if (value === calendarBaseDayType(date)) {
    return repository.updateDay(date, (day) => {
      const updated = { ...day }
      delete updated.dayTypeOverride
      return updated
    })
  }
  if (isDayTypeOverride(value)) {
    return repository.updateDay(date, (day) => ({ ...day, dayTypeOverride: value }))
  }
  return Promise.resolve()
}

interface UseMonthGridMutationsInput {
  repository: MonthRepository
  year: number
  month: number
  monthData: MonthData
}

export function useMonthGridMutations({ repository, year, month, monthData }: UseMonthGridMutationsInput) {
  const queryClient = useQueryClient()

  function invalidate() {
    invalidateMonthByYearMonth(queryClient, year, month)
  }

  const dayType = useMutation({
    mutationFn: ({ date, value }: { date: string; value: string }) => saveDayTypeInRepo(repository, date, value),
    onMutate: ({ date }) => {
      const prev = monthData[date]
      return { prevDayTypeOverride: prev?.dayTypeOverride }
    },
    onSuccess: (_, { date, value }, context) => {
      const prevValue = context.prevDayTypeOverride ?? calendarBaseDayType(date)
      useUndoStore.getState().push({
        description: 'Change day type',
        undo: async () => {
          await saveDayTypeInRepo(repository, date, prevValue)
          invalidate()
        },
        redo: async () => {
          await saveDayTypeInRepo(repository, date, value)
          invalidate()
        },
      })
      invalidate()
    },
  })

  const location = useMutation({
    mutationFn: ({ date, location }: { date: string; location: WorkLocation | null }) =>
      repository.updateDay(date, (day) => {
        if (!location) {
          const updated = { ...day }
          delete updated.location
          return updated
        }
        return { ...day, location }
      }),
    onMutate: ({ date }) => {
      const prev = monthData[date]
      return { prevLocation: prev?.location ?? null }
    },
    onSuccess: (_, { date, location }, context) => {
      const prevLocation = context.prevLocation
      useUndoStore.getState().push({
        description: 'Change location',
        undo: async () => {
          await repository.updateDay(date, (day) => {
            if (!prevLocation) {
              const updated = { ...day }
              delete updated.location
              return updated
            }
            return { ...day, location: prevLocation }
          })
          invalidate()
        },
        redo: async () => {
          await repository.updateDay(date, (day) => {
            if (!location) {
              const updated = { ...day }
              delete updated.location
              return updated
            }
            return { ...day, location }
          })
          invalidate()
        },
      })
      invalidate()
    },
  })

  return { dayType, location }
}
