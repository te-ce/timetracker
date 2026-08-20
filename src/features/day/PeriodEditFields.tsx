import { BlurCancelHint } from './BlurCancelHint'

export interface PeriodEditFieldsProps {
  ordinal: number
  start: string
  setStart: (v: string) => void
  end: string
  setEnd: (v: string) => void
  pendingCancel: boolean
  handleBlur: (e: React.FocusEvent) => void
  handleFocus: () => void
  onSave: () => void
  onCancel: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function PeriodEditFields({
  ordinal,
  start,
  setStart,
  end,
  setEnd,
  pendingCancel,
  handleBlur,
  handleFocus,
  onSave,
  onCancel,
  onKeyDown,
}: PeriodEditFieldsProps) {
  return (
    <span className="relative flex items-center gap-1" onBlur={handleBlur} onFocus={handleFocus}>
      {pendingCancel && <BlurCancelHint />}
      <input
        // These fields only mount while the row is being edited, so the caret
        // lands on the start time exactly when the editor opens.
        autoFocus
        type="time"
        aria-label={`Work period ${ordinal} start`}
        value={start}
        onChange={(e) => setStart(e.target.value)}
        onKeyDown={onKeyDown}
        className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <span className="text-gray-400">–</span>
      <input
        type="time"
        aria-label={`Work period ${ordinal} end`}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        onKeyDown={onKeyDown}
        className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <button type="button" onClick={onSave} className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">
        Save
      </button>
      <button type="button" onClick={onCancel} className="ml-1 text-gray-500 dark:text-gray-400">
        Cancel
      </button>
    </span>
  )
}
