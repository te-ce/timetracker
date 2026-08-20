import { useState } from 'react'
import type { ExcelRow } from '../excel/workbookService'

export interface CategorySettingsRowProps {
  cat: string
  idx: number
  isCustom: boolean
  taskId: string
  isAutoMatch: boolean
  dragOverIdx: number | null
  categoryDescription: string | undefined
  excelRows: ExcelRow[]
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number) => void
  onDragEnd: () => void
  onRename: (idx: number, newName: string) => void
  onSaveDesc: (idx: number, newDesc: string) => void
  onMappingChange: (cat: string, taskId: string) => void
  onRemove: (idx: number) => void
}

export function CategorySettingsRow({
  cat,
  idx,
  isCustom,
  taskId,
  isAutoMatch,
  dragOverIdx,
  categoryDescription,
  excelRows,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRename,
  onSaveDesc,
  onMappingChange,
  onRemove,
}: CategorySettingsRowProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')

  const dragOverClass =
    dragOverIdx === idx ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' : ''
  const nameClass = `truncate cursor-pointer ${isCustom ? 'text-indigo-700 dark:text-indigo-300' : ''}`
  const nameTitle = isCustom ? 'Custom — double-click to rename' : 'Double-click to rename'
  return (
    <div
      role="option"
      aria-selected={false}
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const dt: unknown = e.dataTransfer
        if (dt instanceof DataTransfer) {
          dt.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top)
        }
        onDragStart(idx)
      }}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={() => onDrop(idx)}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          onDragStart(idx)
          onDrop(idx - 1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          onDragStart(idx)
          onDrop(idx + 1)
        }
      }}
      className={`flex items-center gap-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-1.5 text-sm cursor-grab active:cursor-grabbing ${dragOverClass}`}
    >
      <span className="text-gray-300 dark:text-gray-600 select-none shrink-0" aria-hidden>
        ⠿
      </span>
      <div className="w-36 shrink-0 flex flex-col gap-0.5 min-w-0">
        {editingName ? (
          <input
            aria-label={`Rename ${cat}`}
            ref={(el) => {
              el?.focus()
            }}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => {
              onRename(idx, nameValue)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(idx, nameValue)
                setEditingName(false)
              }
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="rounded border px-2 py-0.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        ) : (
          <span
            className={nameClass}
            onDoubleClick={() => {
              setEditingName(true)
              setNameValue(cat)
            }}
            data-tooltip={nameTitle}
          >
            {cat}
          </span>
        )}
        {editingDesc ? (
          <input
            aria-label={`Description for ${cat}`}
            ref={(el) => {
              el?.focus()
            }}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={() => {
              onSaveDesc(idx, descValue)
              setEditingDesc(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveDesc(idx, descValue)
                setEditingDesc(false)
              }
              if (e.key === 'Escape') setEditingDesc(false)
            }}
            placeholder="Add description…"
            className="rounded border px-1.5 py-0.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        ) : (
          <button
            type="button"
            aria-label={`Edit description for ${cat}`}
            className="truncate text-left text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => {
              setEditingDesc(true)
              setDescValue(categoryDescription ?? '')
            }}
            data-tooltip="Click to edit description"
          >
            {categoryDescription ?? <em>add description</em>}
          </button>
        )}
      </div>
      <span className="w-4 shrink-0 text-center text-xs text-gray-300 dark:text-gray-600" aria-hidden>
        →
      </span>
      <div className="flex flex-1 items-center gap-1 min-w-0">
        {excelRows.length > 0 ? (
          <>
            {isAutoMatch && (
              <span
                className="shrink-0 rounded bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                data-tooltip="Auto-matched — please verify"
              >
                auto
              </span>
            )}
            <select
              aria-label={`Excel mapping for ${cat}`}
              value={taskId}
              onChange={(e) => onMappingChange(cat, e.target.value)}
              className="flex-1 rounded border bg-transparent pl-2 pr-6 py-0.5 text-xs dark:border-gray-600 dark:text-gray-100 min-w-0"
            >
              <option value="">— not mapped —</option>
              {excelRows.map((row) => (
                <option key={row.taskId} value={row.taskId}>
                  {row.taskId}
                  {row.description ? ` — ${row.description}` : ''}
                </option>
              ))}
            </select>
          </>
        ) : taskId ? (
          <span
            className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-400 truncate"
            data-tooltip={taskId}
          >
            {taskId}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </div>
      <button
        type="button"
        aria-label={`Remove ${cat}`}
        onClick={() => onRemove(idx)}
        className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium p-1 rounded"
      >
        ✕
      </button>
    </div>
  )
}
