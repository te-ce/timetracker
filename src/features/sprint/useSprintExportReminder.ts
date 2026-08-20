import { useEffect } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { toLocalIso } from '../../shared/dateUtils'
import { resolveAppConfig } from '../../shared/appConfigDefaults'
import { getSprintForDate, getSprintBoundaries, aggregateSprintHours } from './sprint'
import type { SprintConfig } from './sprint'
import {
  getSprintBadgeState,
  shouldNotifyToday,
  dispatchSprintExportNotification,
  SPRINT_EXPORT_NOTIFY_KEY,
} from './sprintExportReminder'
import type { SprintReminderData, SprintBadgeState } from './sprintExportReminder'

const LOOKBACK = 6

function resolveSprintConfig(
  config: { sprintStartDate: string | null; sprintLengthDays: number } | undefined,
  today: string,
): SprintConfig {
  return {
    startDate: config?.sprintStartDate ?? `${today.slice(0, 4)}-01-01`,
    lengthDays: config?.sprintLengthDays ?? 14,
  }
}

export function useSprintExportReminder(): SprintBadgeState {
  const { configRepo, monthRepo, sprintExportRepo } = useRepositories()
  const today = toLocalIso(new Date())

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const sprintConfig = resolveSprintConfig(config, today)
  const currentIndex = getSprintForDate(today, sprintConfig).index
  const indices = Array.from({ length: LOOKBACK + 1 }, (_, i) => currentIndex - i).filter((i) => i >= 0)

  const oldestIndex = indices[indices.length - 1] ?? currentIndex
  const oldestStart = getSprintBoundaries(oldestIndex, sprintConfig).start

  const { data: entries = [] } = useQuery({
    queryKey: ['sprintReminderEntries', oldestStart, today, sprintConfig.startDate, sprintConfig.lengthDays],
    queryFn: () => monthRepo.findEntriesByDateRange(oldestStart, today, resolveAppConfig(config).weekdayHours),
    enabled: !!config,
  })

  const exportQueries = useQueries({
    queries: indices.map((index) => ({
      queryKey: QUERY_KEYS.sprintExportByIndex(index),
      queryFn: () => sprintExportRepo.findBySprintIndex(index),
      enabled: !!config,
    })),
  })

  const reminderData: SprintReminderData[] = indices.map((index, i) => {
    const sprint = getSprintBoundaries(index, sprintConfig)
    const totalHours = Object.values(aggregateSprintHours(entries, sprint)).reduce((a, b) => a + b, 0)
    const exportStatus = exportQueries[i]?.data?.status ?? null
    return { index, totalHours, exportStatus }
  })

  const badgeState: SprintBadgeState = config
    ? getSprintBadgeState(today, sprintConfig, reminderData)
    : { kind: 'countdown', daysLeft: 0 }
  const pendingKey = badgeState.kind === 'export' ? badgeState.sprints.map((s) => s.index).join(',') : ''

  useEffect(() => {
    if (!pendingKey) return
    const sprintIndices = pendingKey.split(',').map(Number)
    const stored = localStorage.getItem(SPRINT_EXPORT_NOTIFY_KEY)
    if (!shouldNotifyToday(today, sprintIndices, stored)) return
    dispatchSprintExportNotification(sprintIndices)
    localStorage.setItem(SPRINT_EXPORT_NOTIFY_KEY, JSON.stringify({ date: today, indices: sprintIndices }))
  }, [pendingKey, today])

  return badgeState
}
