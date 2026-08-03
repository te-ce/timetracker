import { useState, useEffect, useRef } from 'react'
import { useClock } from '../../shared/useClock'

interface NowChipProps {
  onChange: (v: string) => void
  'aria-label': string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  focusOnMount?: boolean
}

export function NowChip({ onChange, 'aria-label': ariaLabel, onKeyDown, className, focusOnMount }: NowChipProps) {
  const now = useClock()
  const [isNow, setIsNow] = useState(true)
  const [customValue, setCustomValue] = useState(now)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus()
  }, [focusOnMount])

  const displayValue = isNow ? now : customValue

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <input
        ref={inputRef}
        type="time"
        value={displayValue}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setIsNow(false)
          setCustomValue(e.target.value)
          onChange(e.target.value)
        }}
        className="rounded-lg border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
      />
      <button
        type="button"
        aria-label="now"
        aria-pressed={isNow}
        onClick={() => {
          setIsNow(true)
          onChange(now)
        }}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-mono cursor-pointer ${
          isNow
            ? 'text-indigo-600 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900'
            : 'text-gray-400 border-gray-300 bg-gray-50 hover:bg-gray-100 dark:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
        }`}
      >
        <span className="text-xs">●</span>
        now
      </button>
    </div>
  )
}
