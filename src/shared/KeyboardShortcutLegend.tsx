import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onClose: () => void
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['M'], description: 'Go to Month view' },
  { keys: ['G'], description: 'Go to Table view' },
  { keys: ['D'], description: 'Go to Day view (today)' },
  { keys: ['S'], description: 'Go to Sprint view' },
  { keys: ['T'], description: 'Jump to today' },
  { keys: ['←', '→'], description: 'Previous / next day (Day view)' },
  { keys: ['Ctrl', 'Z'], description: 'Undo last change' },
  { keys: ['Ctrl', '⇧', 'Z'], description: 'Redo' },
  { keys: ['?'], description: 'Show / hide this legend' },
  { keys: ['Esc'], description: 'Close dialogs' },
]

export function KeyboardShortcutLegend({ onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onClose])

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/20" />
      <div
        ref={ref}
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="fixed left-1/2 top-1/2 z-[200] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl"
      >
        <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-3">
          <p className="text-sm font-semibold">Keyboard shortcuts</p>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none p-1 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ul className="px-5 py-4 flex flex-col gap-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <li key={description} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{description}</span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
                      {k}
                    </kbd>
                    {i < keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body,
  )
}
