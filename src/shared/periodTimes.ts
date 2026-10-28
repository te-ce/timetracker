import type { WorkPeriod } from '../infra/repositories/types'
import { calcSubtaskHours } from './worktime'

/** New times for a WorkPeriod. Giving it an end also stops a live subtask there, so none is left running on its own. */
export function withPeriodTimes(period: WorkPeriod, start: string, end: string | null): WorkPeriod {
  if (end === null) return { ...period, start, end }
  return {
    ...period,
    start,
    end,
    subtasks: period.subtasks.map((s) =>
      s.startedAt && !s.stoppedAt ? { ...s, stoppedAt: end, hours: calcSubtaskHours(s.startedAt, end) } : s,
    ),
  }
}
