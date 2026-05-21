import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { WorkPeriodRepository } from '../repositories/types'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'

interface Props {
  date: string
  workedHours: number
  repository: WorkPeriodRepository
  className?: string
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
  const ref = useRef<HTMLDivElement>(null)
  const cellRef = useRef<HTMLTableCellElement>(null)
  const [dialogPos, setDialogPos] = useState({ top: 0, left: 0 })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', date, 'cell'],
    queryFn: () => repository.findByDate(new Date(date)),
    enabled: open,
  })

  const { save: addMutation, remove: removeMutation } = useWorkPeriodMutations(repository)

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
    if (!draftStart || !draftEnd) return
    addMutation.mutate({ id: crypto.randomUUID(), date, start: draftStart, end: draftEnd })
    setDraftStart('')
    setDraftEnd('')
  }

  if (!open) {
    return (
      <td
        ref={cellRef}
        className={`px-2 py-1 text-right cursor-pointer hover:bg-indigo-50 ${className}`}
        data-testid="worked-hours"
        onClick={() => {
          if (cellRef.current) {
            const rect = cellRef.current.getBoundingClientRect()
            setDialogPos({ top: rect.bottom + 4, left: rect.left })
          }
          setOpen(true)
        }}
      >
        {workedHours > 0 ? workedHours : ''}
      </td>
    )
  }

  return (
    <td className="px-2 py-1 text-right" data-testid="worked-hours">
      <div
        ref={ref}
        style={{ top: dialogPos.top, left: dialogPos.left }}
        className="fixed z-[200] w-56 rounded-lg border bg-white p-3 shadow-lg"
      >
        <ul className="flex flex-col gap-1 mb-2">
          {windows.map((w) => (
            <li key={w.id} className="flex items-center justify-between text-xs">
              <span>{w.start}–{w.end ?? '…'}</span>
              <span className="text-gray-500 mr-1">{w.end ? windowDuration(w.start, w.end).toFixed(2) + 'h' : '…'}</span>
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
        <div className="flex items-center gap-1">
          <input
            type="time"
            aria-label="From"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            className="w-20 rounded border px-1 py-0.5 text-xs"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="time"
            aria-label="To"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            className="w-20 rounded border px-1 py-0.5 text-xs"
          />
          <button
            onClick={handleAdd}
            disabled={!draftStart || !draftEnd}
            className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-40"
            aria-label="Add"
          >
            +
          </button>
        </div>
      </div>
    </td>
  )
}
