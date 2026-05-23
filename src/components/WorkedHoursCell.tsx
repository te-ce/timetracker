import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { WorkPeriod, WorkPeriodRepository } from '../repositories/types'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'

interface Props {
  date: string
  workedHours: number
  repository: WorkPeriodRepository
  className?: string
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function windowDuration(start: string, end: string | null): number {
  if (!end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

export function WorkedHoursCell({ date, workedHours, repository, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const { data: windows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByDateCell(date),
    queryFn: () => repository.findByDate(new Date(date)),
    enabled: open,
  })

  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const { save: addMutation, remove: removeMutation } = useWorkPeriodMutations(repository)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleAdd() {
    if (!draftStart) return
    const incoming: WorkPeriod = { id: crypto.randomUUID(), date, start: draftStart, end: draftEnd || null }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    addMutation.mutate(merged)
    absorbed.forEach((id) => removeMutation.mutate(id))
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
    addMutation.mutate(merged)
    absorbed.forEach((id) => removeMutation.mutate(id))
    setEditingId(null)
  }

  const dateLabel = new Date(date + 'T12:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (!open) {
    return (
      <td
        className={`px-2 py-1 text-right cursor-pointer hover:bg-indigo-50 ${className}`}
        data-testid="worked-hours"
        onClick={() => setOpen(true)}
      >
        {workedHours > 0 ? workedHours : ''}
      </td>
    )
  }

  return (
    <td className="px-2 py-1 text-right" data-testid="worked-hours">
      {createPortal(
        <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/20" />
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm rounded-xl border bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Work periods</p>
            <p className="text-sm font-semibold">{dateLabel}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Period list */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No periods recorded yet</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sorted.map((w) => (
                <li key={w.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  {editingId === w.id ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="time"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="rounded border px-1.5 py-0.5 text-sm w-24"
                        />
                        <button
                          type="button"
                          onClick={() => setEditStart(nowHHMM())}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Now
                        </button>
                        <span className="text-gray-400">–</span>
                        <input
                          type="time"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="rounded border px-1.5 py-0.5 text-sm w-24"
                        />
                        <button
                          type="button"
                          onClick={() => setEditEnd(nowHHMM())}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Now
                        </button>
                      </div>
                      <div className="flex gap-2 ml-2 shrink-0">
                        <button
                          onClick={handleEditSave}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="font-mono font-medium hover:text-indigo-600 text-left"
                        onClick={() => handleEditBegin(w)}
                        title="Click to edit"
                      >
                        {w.start}–{w.end ?? '…'}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {w.end && (
                          <span className="text-xs text-gray-400">{windowDuration(w.start, w.end).toFixed(2)}h</span>
                        )}
                        <button
                          onClick={() => removeMutation.mutate(w.id)}
                          className="text-gray-400 hover:text-red-500 text-base leading-none"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add form */}
        <div className="border-t px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor={`wpc-start-${date}`} className="text-xs font-medium text-gray-600 w-10 shrink-0">
              Start
            </label>
            <input
              id={`wpc-start-${date}`}
              type="time"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => setDraftStart(nowHHMM())}
              className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 shrink-0"
            >
              Now
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={`wpc-end-${date}`} className="text-xs font-medium text-gray-600 w-10 shrink-0">
              End
            </label>
            <input
              id={`wpc-end-${date}`}
              type="time"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => setDraftEnd(nowHHMM())}
              className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 shrink-0"
            >
              Now
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={!draftStart}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
            aria-label="Add"
          >
            Add period
          </button>
        </div>
      </div>
        </>,
        document.body
      )}
    </td>
  )
}
