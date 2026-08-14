interface TimeNowFieldProps {
  now: string
  value: string | null
  onChange: (value: string | null) => void
  ariaLabel: string
  onConfirm?: () => void
}

export function TimeNowField({ now, value, onChange, ariaLabel, onConfirm }: TimeNowFieldProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="time"
        aria-label={ariaLabel}
        value={value ?? now}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onConfirm?.()}
        className="h-7 rounded border bg-transparent px-1.5 font-mono text-sm dark:border-gray-600 dark:text-gray-100"
      />
      {value !== null && (
        <button
          type="button"
          aria-label="Reset to now"
          title="Reset to now"
          onClick={() => onChange(null)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ↺
        </button>
      )}
    </span>
  )
}
