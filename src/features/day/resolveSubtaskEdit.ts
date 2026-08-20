import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { calcSubtaskHours, parseDurationInput } from '../../shared/worktime'

export function resolveSubtaskEdit(
  sl: WorkPeriodSubtask,
  category: string,
  note: string | undefined,
  start: string,
  end: string,
  hoursRaw: string,
  submode: 'timed' | 'decimal',
): { subtask: WorkPeriodSubtask; valid: boolean } {
  if (submode === 'timed') {
    if (!end) {
      if (!start) return { subtask: sl, valid: false }
      return { subtask: { ...sl, category, startedAt: start, stoppedAt: undefined, note }, valid: true }
    }
    const h = calcSubtaskHours(start, end)
    if (!h || h <= 0) return { subtask: sl, valid: false }
    return { subtask: { ...sl, category, hours: h, startedAt: start, stoppedAt: end, note }, valid: true }
  }
  const h = parseDurationInput(hoursRaw)
  if (!h || h <= 0) return { subtask: sl, valid: false }
  return { subtask: { ...sl, category, hours: h, startedAt: undefined, stoppedAt: undefined, note }, valid: true }
}
