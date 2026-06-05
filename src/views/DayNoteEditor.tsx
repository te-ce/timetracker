import { useState } from 'react'

interface Props {
  dayNote: string | null
  onSave: (note: string) => void
}

export function DayNoteEditor({ dayNote, onSave }: Props) {
  const [noteValue, setNoteValue] = useState<string | null>(null)
  const [prevDayNote, setPrevDayNote] = useState(dayNote)

  if (prevDayNote !== dayNote) {
    setPrevDayNote(dayNote)
    setNoteValue(null)
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {noteValue !== null ? (
        <div className="flex flex-col gap-1">
          <textarea
            className="w-full rounded border px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 resize-none"
            rows={3}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            ref={(el) => el?.focus()}
            placeholder="Add a note for this day…"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setNoteValue(null)}
              className="rounded border px-3 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(noteValue.trim())
                setNoteValue(null)
              }}
              className="rounded border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            >
              Save
            </button>
          </div>
        </div>
      ) : dayNote ? (
        <div className="flex items-start gap-1">
          <button
            onClick={() => setNoteValue(dayNote)}
            className="flex-1 min-w-0 text-left rounded border px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 whitespace-pre-wrap"
          >
            {dayNote}
          </button>
          <button
            onClick={() => onSave('')}
            className="shrink-0 text-xs text-red-500 dark:text-red-400 hover:underline py-1.5"
          >
            Clear
          </button>
        </div>
      ) : (
        <button
          onClick={() => setNoteValue('')}
          className="w-full text-left rounded border border-dashed px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          Add a note…
        </button>
      )}
    </div>
  )
}
