import { useUndoStore } from '../../shared/undoStore'

export function UndoButton() {
  const { canUndo, canRedo, undo, redo } = useUndoStore()
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => void undo()}
        disabled={!canUndo}
        aria-label="Undo"
        data-tooltip="Undo (Ctrl+Z)"
        className="tooltip-below rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void redo()}
        disabled={!canRedo}
        aria-label="Redo"
        data-tooltip="Redo (Ctrl+Shift+Z)"
        className="tooltip-below rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>
    </div>
  )
}
