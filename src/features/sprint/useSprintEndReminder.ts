import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { getSprintForDate } from './sprint'
import { isSprintLastDay } from './sprintExportReminder'
import { resolveSprintConfig } from './useSprintExportReminder'

/** True when `today` closes a sprint whose export is still outstanding; undefined while loading. */
export function useSprintEndReminderDue(
  config: { sprintStartDate: string | null; sprintLengthDays: number } | undefined,
  today: string,
): boolean | undefined {
  const { sprintExportRepo } = useRepositories()
  const sprintConfig = resolveSprintConfig(config, today)
  const index = getSprintForDate(today, sprintConfig).index
  const { data: sprintExport } = useQuery({
    queryKey: QUERY_KEYS.sprintExportByIndex(index),
    queryFn: () => sprintExportRepo.findBySprintIndex(index),
  })
  if (sprintExport === undefined) return undefined
  return isSprintLastDay(today, sprintConfig) && sprintExport?.status !== 'exported'
}
