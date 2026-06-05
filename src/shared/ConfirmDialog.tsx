import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onConfirm, onCancel])

  return createPortal(
    <>
      <button
        className="fixed inset-0 z-[100] bg-black/30 cursor-default"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed left-1/2 top-1/2 z-[200] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="confirm-dialog-title" className="text-base font-semibold dark:text-gray-100">
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${
              danger
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
