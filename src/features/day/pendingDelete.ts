import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'

/** What the confirm dialog is about to delete: a whole period, or one subtask of it. */
export type PendingDelete =
  | { kind: 'period'; period: WorkPeriod }
  | { kind: 'subtask'; periodId: string; subtask: WorkPeriodSubtask }
