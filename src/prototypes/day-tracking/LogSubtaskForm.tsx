// PROTOTYPE — the "I forgot to track this" control: a duration and a category,
// no times. Shared by every variant because it is a single control, not a layout.
import { useEffect, useRef, useState } from 'react'
import { parseDurationInput } from '../../shared/worktime'
import { categoryLabel, optionsFor } from './protoShared'

/** Accepts `30m`, `0:30`, `0.5`, `1,5h`. */
export function parseDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(',', '.')
  const minutes = /^(\d+)\s*m(in)?$/.exec(text)
  if (minutes) return Number(minutes[1]) / 60
  return parseDurationInput(text.replace(/h$/, ''))
}

interface Props {
  categories: string[]
  defaultCategory: string
  onLog: (category: string, hours: number) => void
  label?: string
  compact?: boolean
}

export function LogSubtaskForm({ categories, defaultCategory, onLog, label, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const inputRef = useRef<HTMLInputElement>(null)
  const hours = parseDuration(duration)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-left text-xs text-gray-500 underline decoration-dotted hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 ${
          compact ? '' : 'py-1'
        }`}
      >
        {label ?? '+ log untracked subtask'}
      </button>
    )
  }

  function submit() {
    if (hours === null || hours <= 0) return
    onLog(category, hours)
    setDuration('')
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <input
        ref={inputRef}
        type="text"
        aria-label="Subtask duration"
        placeholder="30m"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-16 rounded border px-1.5 py-1 font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <select
        aria-label="Subtask category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="max-w-[10rem] rounded border px-1.5 py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      >
        {optionsFor(category, categories).map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={hours === null || hours <= 0}
        className="rounded bg-indigo-600 px-2 py-1 font-semibold text-white disabled:opacity-40"
      >
        Log
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-500">
        Cancel
      </button>
    </div>
  )
}
