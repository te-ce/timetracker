import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkWindow, WorkWindowRepository } from '../repositories/types'
import { calculateWorkedHours, calculateRestarbeitszeit } from '../domain/worktime'

interface Props {
  date: string
  sollstunden: number
  repository: WorkWindowRepository
}

export function WorkWindowPanel({ date, sollstunden, repository }: Props) {
  const queryClient = useQueryClient()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', date],
    queryFn: () => repository.findByDate(new Date(date)),
  })

  const addMutation = useMutation({
    mutationFn: (w: WorkWindow) => repository.save(w),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workWindows', date] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workWindows', date] }),
  })

  const workedHours = calculateWorkedHours(windows)
  const restarbeitszeit = calculateRestarbeitszeit(sollstunden, workedHours)

  function handleAdd() {
    if (!start || !end) return
    addMutation.mutate({ id: crypto.randomUUID(), date, start, end })
    setStart('')
    setEnd('')
  }

  function handleRemove(id: string) {
    removeMutation.mutate(id)
  }

  function handleEditStart(w: WorkWindow) {
    setEditingId(w.id)
    setEditStart(w.start)
    setEditEnd(w.end)
  }

  function handleEditSave() {
    if (!editingId || !editStart || !editEnd) return
    const existing = windows.find((w) => w.id === editingId)
    if (!existing) return
    addMutation.mutate({ ...existing, start: editStart, end: editEnd })
    setEditingId(null)
  }

  function handleEditCancel() {
    setEditingId(null)
  }

  return (
    <section aria-label="Work windows" className="flex flex-col gap-6">
      {/* Add window form */}
      <div className="flex items-end gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </label>
        <button
          onClick={handleAdd}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          disabled={!start || !end}
        >
          Add
        </button>
      </div>

      {/* Windows list + summary */}
      {windows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-gray-400">
          No work windows recorded — add your first time block above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {windows.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 text-sm shadow-sm"
              >
                {editingId === w.id ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleEditCancel()
                          if (e.key === 'Enter') handleEditSave()
                        }}
                        className="rounded border px-2 py-1 text-sm"
                      />
                      <span>–</span>
                      <input
                        type="time"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleEditCancel()
                          if (e.key === 'Enter') handleEditSave()
                        }}
                        className="rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSave}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className="cursor-pointer font-mono font-medium hover:text-indigo-600"
                      onClick={() => handleEditStart(w)}
                    >
                      {w.start} – {w.end}
                    </span>
                    <button
                      onClick={() => handleRemove(w.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="flex gap-3">
            <div
              aria-label="Worked hours"
              className="flex-1 rounded-lg border bg-white px-4 py-3 text-center shadow-sm"
            >
              <p className="text-xs text-gray-500">Worked</p>
              <p className="text-lg font-bold">{workedHours}h worked</p>
            </div>
            <div
              aria-label="Restarbeitszeit"
              data-overtime={restarbeitszeit.isOvertime}
              className={`flex-1 rounded-lg border px-4 py-3 text-center shadow-sm ${
                restarbeitszeit.isOvertime
                  ? 'border-amber-300 bg-amber-50'
                  : restarbeitszeit.value === 0
                    ? 'border-green-300 bg-green-50'
                    : 'bg-white'
              }`}
            >
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-lg font-bold">
                {restarbeitszeit.value > 0
                  ? `${restarbeitszeit.value}h remaining`
                  : restarbeitszeit.isOvertime
                    ? `${Math.abs(restarbeitszeit.value)}h overtime`
                    : 'On target'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
