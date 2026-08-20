import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  HEADER_ITEM_LABELS,
  loadHeaderLayout,
  saveHeaderLayout,
  type HeaderItemId,
  type HeaderLayoutState,
} from './headerLayout'
import { KeyboardShortcutsButton } from './KeyboardShortcutsButton'
import { OfficeStatsBadge } from './OfficeStatsBadge'
import { RemainingHoursBadge } from './RemainingHoursBadge'
import { SyncIndicator } from './SyncIndicator'
import { ThemeToggle } from './ThemeToggle'
import { TimeFormatToggle } from './TimeFormatToggle'
import { UndoButton } from './UndoButton'

export function HeaderControls({ onToggleLegend }: { onToggleLegend: () => void }) {
  const [layout, setLayout] = useState<HeaderLayoutState>(loadHeaderLayout)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<HeaderItemId | null>(null)
  const dragItemRef = useRef<HeaderItemId | null>(null)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overflowOpen) return
    function onClickOutside(e: MouseEvent) {
      if (overflowRef.current && e.target instanceof Node && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [overflowOpen])

  function updateLayout(next: HeaderLayoutState) {
    setLayout(next)
    saveHeaderLayout(next)
  }

  function hideItem(id: HeaderItemId) {
    updateLayout({ ...layout, hidden: [...layout.hidden, id] })
  }

  function showItem(id: HeaderItemId) {
    updateLayout({ ...layout, hidden: layout.hidden.filter((h) => h !== id) })
    setOverflowOpen(false)
  }

  function onDragStart(id: HeaderItemId) {
    dragItemRef.current = id
  }

  function onDragOver(e: React.DragEvent, id: HeaderItemId) {
    e.preventDefault()
    setDragOverId(id)
  }

  function onDrop(targetId: HeaderItemId) {
    const src = dragItemRef.current
    if (!src || src === targetId) {
      setDragOverId(null)
      return
    }
    const order = [...layout.order]
    const fromIdx = order.indexOf(src)
    const toIdx = order.indexOf(targetId)
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, src)
    updateLayout({ ...layout, order })
    setDragOverId(null)
    dragItemRef.current = null
  }

  function onDragEnd() {
    setDragOverId(null)
    dragItemRef.current = null
  }

  function renderItem(id: HeaderItemId): React.ReactNode {
    switch (id) {
      case 'remainingHours':
        return <RemainingHoursBadge />
      case 'officeStats':
        return <OfficeStatsBadge />
      case 'sync':
        return <SyncIndicator />
      case 'timeFormat':
        return <TimeFormatToggle />
      case 'undo':
        return <UndoButton />
      case 'shortcuts':
        return <KeyboardShortcutsButton onToggle={onToggleLegend} />
      case 'theme':
        return <ThemeToggle />
    }
  }

  const hiddenSet = new Set(layout.hidden)
  const visible = layout.order.filter((id) => !hiddenSet.has(id))
  const hidden = layout.hidden

  return (
    <div className="flex items-center gap-1">
      {visible.map((id) => (
        <div
          key={id}
          className={`group relative flex items-center rounded-md transition-shadow ${dragOverId === id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
          draggable
          onDragStart={() => onDragStart(id)}
          onDragOver={(e) => onDragOver(e, id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={() => onDrop(id)}
          onDragEnd={onDragEnd}
          style={{ cursor: 'grab' }}
        >
          {renderItem(id)}
          <button
            type="button"
            onClick={() => hideItem(id)}
            aria-label={`Remove ${HEADER_ITEM_LABELS[id]}`}
            className="absolute -top-1.5 -right-1.5 z-10 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-2 h-2"
              aria-hidden="true"
            >
              <path d="M1 1l6 6M7 1L1 7" />
            </svg>
          </button>
        </div>
      ))}
      {hidden.length > 0 && (
        <div ref={overflowRef} className="relative">
          <button
            type="button"
            onClick={() => setOverflowOpen((v) => !v)}
            aria-label="Hidden header items"
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors leading-none"
          >
            •••
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-36 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 py-1">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">Hidden items</p>
              {hidden.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 flex items-center">{renderItem(id)}</div>
                  <button
                    type="button"
                    onClick={() => showItem(id)}
                    aria-label={`Restore ${HEADER_ITEM_LABELS[id]}`}
                    title={`Restore ${HEADER_ITEM_LABELS[id]}`}
                    className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="w-2.5 h-2.5"
                      aria-hidden="true"
                    >
                      <path d="M5 2v6M2 5h6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
