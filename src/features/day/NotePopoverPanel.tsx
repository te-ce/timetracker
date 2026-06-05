export interface NotePopoverState {
  date: string
  value: string
  top: number
  left: number
}

interface NotePopoverPanelProps {
  state: NotePopoverState | null
  popoverRef: React.RefObject<HTMLDivElement | null>
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

export function NotePopoverPanel({ state, popoverRef, onChange, onSave, onClose }: NotePopoverPanelProps) {
  if (!state) return null
  return (
    <div
      ref={popoverRef}
      style={{ top: state.top, left: state.left }}
      className="fixed z-[300] w-64 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Note for {state.date}</p>
      <textarea
        className="w-full rounded border px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 resize-none"
        rows={4}
        value={state.value}
        onChange={(e) => onChange(e.target.value)}
        ref={(el) => el?.focus()}
        placeholder="Add a note…"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave()
        }}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="rounded border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
        >
          Save
        </button>
      </div>
    </div>
  )
}
