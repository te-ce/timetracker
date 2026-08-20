import { inputClass } from './subtaskFieldClass'
import { TimedHoursDisplay } from './TimedHoursDisplay'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'

export interface SubtaskHoursFieldProps {
  submode: 'timed' | 'decimal'
  editEnd: string
  editStart: string
  sl: WorkPeriodSubtask
  editHours: string
  setEditHours: (v: string) => void
  kd: (e: React.KeyboardEvent) => void
  hoursInputRef: React.RefObject<HTMLInputElement | null>
}

export function SubtaskHoursField({
  submode,
  editEnd,
  editStart,
  sl,
  editHours,
  setEditHours,
  kd,
  hoursInputRef,
}: SubtaskHoursFieldProps) {
  if (submode === 'timed') return <TimedHoursDisplay editEnd={editEnd} editStart={editStart} sl={sl} />
  return (
    <input
      type="text"
      value={editHours}
      onChange={(e) => setEditHours(e.target.value)}
      onKeyDown={kd}
      aria-label="Subtask hours"
      ref={hoursInputRef}
      className={`${inputClass} w-12 text-right`}
    />
  )
}
