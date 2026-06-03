import { useState } from 'react'
import type { WorkPeriod, MonthRepository } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
}

interface RowProps {
  w: WorkPeriod
  next: WorkPeriod | null
  isEditing: boolean
  editStart: string
  editEnd: string
  onEditBegin: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditStartChange: (v: string) => void
  onEditEndChange: (v: string) => void
  onRemove: () => void
  onMerge: (next: WorkPeriod) => void
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function windowDuration(start: string, end: string | null): number {
  if (!end) return 0
  const startParts = start.split(':').map(Number)
  const endParts = end.split(':').map(Number)
  const sh = startParts[0] ?? 0
  const sm = startParts[1] ?? 0
  const eh = endParts[0] ?? 0
  const em = endParts[1] ?? 0
  return (eh * 60 + em - sh * 60 - sm) / 60
}

function PeriodRow({
  w,
  next,
  isEditing,
  editStart,
  editEnd,
  onEditBegin,
  onEditSave,
  onEditCancel,
  onEditStartChange,
  onEditEndChange,
  onRemove,
  onMerge,
}: RowProps) {
  const canMerge = next !== null && w.end !== null

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onEditCancel()
    if (e.key === 'Enter') onEditSave()
  }

  return (
    <li className="relative flex items-center justify-between rounded-lg border dark:border-gray-700 px-3 py-2 text-sm">
      {isEditing ? (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="time"
              aria-label="Edit start time"
              value={editStart}
              onChange={(e) => onEditStartChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded border px-1.5 py-0.5 text-sm w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => onEditStartChange(nowHHMM())}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Now
            </button>
            <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
              –
            </span>
            <input
              type="time"
              aria-label="Edit end time"
              value={editEnd}
              onChange={(e) => onEditEndChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded border px-1.5 py-0.5 text-sm w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => onEditEndChange(nowHHMM())}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Now
            </button>
          </div>
          <div className="flex gap-2 ml-2 shrink-0">
            <button
              onClick={onEditSave}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              Save
            </button>
            <button
              onClick={onEditCancel}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="font-mono font-medium hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
            onClick={onEditBegin}
            aria-label={`Edit period ${w.start} to ${w.end ?? 'open end'}`}
          >
            {w.start} – {w.end ?? '…'}
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {w.end && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {windowDuration(w.start, w.end).toFixed(2)}h
              </span>
            )}
            <button
              onClick={onRemove}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-base leading-none"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        </>
      )}
      {canMerge && (
        <div className="group absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <button
            onClick={() => onMerge(next)}
            className="cursor-pointer select-none text-base leading-none text-gray-400 dark:text-gray-500 opacity-30 transition-all hover:scale-125 hover:text-indigo-500 dark:hover:text-indigo-400 hover:opacity-100"
            aria-label={`Merge ${w.start}–${w.end} with ${next.start}–${next.end ?? '…'}`}
          >
            🔗
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 dark:bg-gray-700 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            Merge periods
          </span>
        </div>
      )}
    </li>
  )
}

export function WorkPeriodEditor({ date, windows, repository }: Props) {
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const { remove: removeMutation, saveWithAbsorbed } = useWorkPeriodMutations(repository)

  function handleAdd() {
    if (!draftStart) return
    const incoming: WorkPeriod = { id: crypto.randomUUID(), start: draftStart, end: draftEnd || null }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    saveWithAbsorbed.mutate({ date, window: merged, absorbed })
    setDraftStart('')
    setDraftEnd('')
  }

  function handleEditBegin(w: WorkPeriod) {
    setEditingId(w.id)
    setEditStart(w.start)
    setEditEnd(w.end ?? '')
  }

  function handleEditSave() {
    if (!editingId || !editStart) return
    const existing = windows.find((w) => w.id === editingId)
    if (!existing) return
    const incoming: WorkPeriod = { ...existing, start: editStart, end: editEnd || null }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    saveWithAbsorbed.mutate({ date, window: merged, absorbed })
    setEditingId(null)
  }

  function handleMerge(a: WorkPeriod, b: WorkPeriod) {
    const laterEnd = b.end === null ? null : a.end! >= b.end ? a.end : b.end
    saveWithAbsorbed.mutate({ date, window: { ...a, end: laterEnd }, absorbed: [b.id] })
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No periods recorded yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((w, i) => (
            <PeriodRow
              key={w.id}
              w={w}
              next={sorted[i + 1] ?? null}
              isEditing={editingId === w.id}
              editStart={editStart}
              editEnd={editEnd}
              onEditBegin={() => handleEditBegin(w)}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
              onEditStartChange={setEditStart}
              onEditEndChange={setEditEnd}
              onRemove={() => removeMutation.mutate({ date, id: w.id })}
              onMerge={(next) => handleMerge(w, next)}
            />
          ))}
        </ul>
      )}

      <div className="border-t dark:border-gray-700 pt-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`wpe-start-${date}`}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 shrink-0"
          >
            Start
          </label>
          <input
            id={`wpe-start-${date}`}
            type="time"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setDraftStart(nowHHMM())}
            className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
          >
            Now
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor={`wpe-end-${date}`}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 shrink-0"
          >
            End
          </label>
          <input
            id={`wpe-end-${date}`}
            type="time"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setDraftEnd(nowHHMM())}
            className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
          >
            Now
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={!draftStart}
          className="w-full rounded-lg bg-indigo-600 dark:bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-40"
        >
          Add period
        </button>
      </div>
    </div>
  )
}
