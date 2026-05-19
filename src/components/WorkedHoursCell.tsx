import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkWindowRepository } from '../repositories/types'

interface Props {
  date: string
  workedHours: number
  repository: WorkWindowRepository
}

function hoursToTime(hours: number): { start: string; end: string } {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return { start: '00:00', end: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
}

function windowDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

export function WorkedHoursCell({ date, workedHours, repository }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', date, 'cell'],
    queryFn: () => repository.findByDate(new Date(date)),
    enabled: open,
  })

  const addMutation = useMutation({
    mutationFn: async (hours: number) => {
      const { start, end } = hoursToTime(hours)
      await repository.save({ id: crypto.randomUUID(), date, start, end })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workWindows', date] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workWindows', date] })
    },
  })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleAdd() {
    const hours = parseFloat(draft)
    if (isNaN(hours) || hours <= 0) return
    addMutation.mutate(hours)
    setDraft('')
  }

  if (!open) {
    return (
      <td
        className="px-2 py-1 text-right cursor-pointer hover:bg-indigo-50"
        data-testid="worked-hours"
        onClick={() => setOpen(true)}
      >
        {workedHours > 0 ? workedHours : ''}
      </td>
    )
  }

  return (
    <td className="relative px-1 py-0.5" data-testid="worked-hours">
      <div ref={ref} className="absolute z-10 top-0 left-0 w-48 rounded-lg border bg-white p-3 shadow-lg">
        <ul className="flex flex-col gap-1 mb-2">
          {windows.map((w) => (
            <li key={w.id} className="flex items-center justify-between text-xs">
              <span>{w.start}–{w.end}</span>
              <span className="text-gray-500 mr-1">{windowDuration(w.start, w.end).toFixed(1)}h</span>
              <button
                onClick={() => removeMutation.mutate(w.id)}
                className="text-red-400 hover:text-red-600"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            type="number"
            min="0"
            step="0.5"
            aria-label="Add hours"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            className="w-16 rounded border px-1 py-0.5 text-xs"
          />
          <button
            onClick={handleAdd}
            className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700"
            aria-label="Add"
          >
            Add
          </button>
        </div>
      </div>
    </td>
  )
}
