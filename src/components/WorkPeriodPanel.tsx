import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { WorkPeriod, WorkPeriodRepository } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'

interface Props {
  date: string
  repository: WorkPeriodRepository
}

export function WorkPeriodPanel({ date, repository }: Props) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const { data: windows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByDate(date),
    queryFn: () => repository.findByDate(new Date(date)),
  })

  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))

  const { save: addMutation, remove: removeMutation } = useWorkPeriodMutations(repository)

  function handleAdd() {
    if (!start) return
    const incoming: WorkPeriod = { id: crypto.randomUUID(), date, start, end: end || null }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    addMutation.mutate(merged)
    absorbed.forEach((id) => removeMutation.mutate(id))
    setStart('')
    setEnd('')
  }

  function handleRemove(id: string) {
    removeMutation.mutate(id)
  }

  function handleEditStart(w: WorkPeriod) {
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

  function handleEditCancel() {
    setEditingId(null)
  }

  function handleMerge(a: WorkPeriod, b: WorkPeriod) {
    // a.start <= b.start (sorted), a.end !== null
    const laterEnd = b.end === null ? null : a.end! >= b.end ? a.end : b.end
    addMutation.mutate({ ...a, end: laterEnd })
    removeMutation.mutate(b.id)
  }

  function nowHHMM() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <section aria-label="Work windows" className="flex flex-col gap-6">
      {/* Add period form */}
      <div className="flex items-end gap-3 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start
          <div className="flex gap-1">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setStart(nowHHMM())}
              className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Now
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End
          <div className="flex gap-1">
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setEnd(nowHHMM())}
              className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Now
            </button>
          </div>
        </label>
        <button
          onClick={handleAdd}
          className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-40"
          disabled={!start}
        >
          Add
        </button>
      </div>

      {/* Periods list + summary */}
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white dark:bg-gray-800 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
          No work periods recorded — add your first time block above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {sorted.map((w, i) => {
              const next = i < sorted.length - 1 ? sorted[i + 1] : null
              const canMergeWithNext = next !== null && w.end !== null
              return (
                <li
                  key={w.id}
                  className="relative flex items-center justify-between rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 text-sm shadow-sm"
                >
                  {editingId === w.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          aria-label="Edit start time"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleEditCancel()
                            if (e.key === 'Enter') handleEditSave()
                          }}
                          className="rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => setEditStart(nowHHMM())}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          Now
                        </button>
                        <span aria-hidden="true">–</span>
                        <input
                          type="time"
                          aria-label="Edit end time"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleEditCancel()
                            if (e.key === 'Enter') handleEditSave()
                          }}
                          className="rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => setEditEnd(nowHHMM())}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          Now
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleEditSave} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                          Save
                        </button>
                        <button onClick={handleEditCancel} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="font-mono font-medium hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                        onClick={() => handleEditStart(w)}
                        aria-label={`Edit period ${w.start} to ${w.end ?? 'open end'}`}
                      >
                        {w.start} – {w.end ?? '…'}
                      </button>
                      <button onClick={() => handleRemove(w.id)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400">
                        Remove
                      </button>
                    </>
                  )}
                  {canMergeWithNext && (
                    <div className="group absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
                      <button
                        onClick={() => handleMerge(w, next)}
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
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
