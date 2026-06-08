import { useState, useEffect } from 'react'

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function useNow(): string {
  const [now, setNow] = useState(nowHHMM)
  useEffect(() => {
    const id = setInterval(() => setNow(nowHHMM()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

interface NowChipProps {
  onChange: (v: string) => void
  'aria-label': string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
}

export function NowChip({ onChange, 'aria-label': ariaLabel, onKeyDown, className }: NowChipProps) {
  const now = useNow()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(now)

  if (!isEditing) {
    return (
      <button
        type="button"
        aria-label={`now (${now})`}
        onClick={() => {
          setValue(now)
          onChange(now)
          setIsEditing(true)
        }}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-mono text-indigo-600 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 cursor-pointer ${className ?? ''}`}
      >
        <span className="text-xs">●</span>
        now ({now})
      </button>
    )
  }

  return (
    <input
      type="time"
      value={value}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        setValue(e.target.value)
        onChange(e.target.value)
      }}
      className="rounded-lg border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
    />
  )
}
