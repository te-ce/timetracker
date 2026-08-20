import { inputClass } from './subtaskFieldClass'
export interface TimedRangeFieldsProps {
  editStart: string
  setEditStart: (v: string) => void
  editEnd: string
  setEditEnd: (v: string) => void
  endInputRef: React.RefObject<HTMLInputElement | null>
  kd: (e: React.KeyboardEvent) => void
  timed: boolean
  switchToDecimal: () => void
  submode: 'timed' | 'decimal'
}

export function TimedRangeFields({
  editStart,
  setEditStart,
  editEnd,
  setEditEnd,
  endInputRef,
  kd,
  timed,
  switchToDecimal,
  submode,
}: TimedRangeFieldsProps) {
  if (submode !== 'timed') return null
  return (
    <>
      <input
        type="text"
        value={editStart}
        onChange={(e) => setEditStart(e.target.value)}
        onKeyDown={kd}
        aria-label="Subtask start time"
        className={`${inputClass} w-20`}
      />
      <span className="text-sm text-gray-400">–</span>
      <input
        type="text"
        value={editEnd}
        onChange={(e) => setEditEnd(e.target.value)}
        onKeyDown={kd}
        placeholder="now"
        aria-label="Subtask end time"
        ref={endInputRef}
        className={`${inputClass} w-20 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
      />
      {!editEnd && (
        <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shrink-0">
          running
        </span>
      )}
      {timed && (
        <button
          type="button"
          onClick={switchToDecimal}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 shrink-0"
        >
          use decimal
        </button>
      )}
    </>
  )
}
