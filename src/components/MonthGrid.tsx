import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository, WorkWindowRepository } from '../repositories/types'
import { buildMonthGrid } from '../domain/monthGrid'
import { getAllCategories } from '../domain/categories'
import { WorkedHoursCell } from './WorkedHoursCell'
import type { MonthGridRow } from '../domain/monthGrid'

interface Props {
  year: number
  month: number
  timeEntryRepository: TimeEntryRepository
  workWindowRepository: WorkWindowRepository
  autoCategory: string
  customCategories?: string[]
}

export function MonthGrid({ year, month, timeEntryRepository, workWindowRepository, autoCategory, customCategories = [] }: Props) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({})

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', year, month],
    queryFn: () => timeEntryRepository.findByDateRange(from, to),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', year, month],
    queryFn: () => workWindowRepository.findByDateRange(from, to),
  })

  const saveMutation = useMutation({
    mutationFn: (entry: TimeEntry) => timeEntryRepository.save(entry),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timeEntries', year, month] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timeEntryRepository.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timeEntries', year, month] }),
  })

  const rows = buildMonthGrid({
    year,
    month,
    timeEntries: entries,
    workWindows: windows,
    dayTypes: new Map(),
    autoCategory,
    autoCategoryOverrides: new Map(),
  })

  function draftKey(date: string, category: string) {
    return `${date}::${category}`
  }

  function handleBlur(row: MonthGridRow, category: string) {
    const key = draftKey(row.date, category)
    const raw = drafts[key]
    if (raw === undefined) return

    const hours = parseFloat(raw)
    const existing = entries.find((e) => e.date === row.date && e.category === category)

    if (isNaN(hours) || hours === 0) {
      if (existing) deleteMutation.mutate(existing.id)
    } else {
      saveMutation.mutate({
        id: existing?.id ?? crypto.randomUUID(),
        date: row.date,
        category,
        hours,
      })
    }

    setDrafts((d) => {
      const next = { ...d }
      delete next[key]
      return next
    })
  }

  function getCellValue(row: MonthGridRow, category: string): string {
    const key = draftKey(row.date, category)
    if (drafts[key] !== undefined) return drafts[key]
    const val = row.entries[category]
    return val ? String(val) : ''
  }

  const allCategories = getAllCategories(customCategories)
  const totalWorked = rows.reduce((sum, row) => sum + row.workedHours, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Day</th>
            <th className="px-2 py-1 text-right" role="columnheader">Worked</th>
            <th className="w-px border-l border-gray-300"></th>
            {allCategories.map((cat) => (
              <th key={cat} className="px-2 py-1 text-right" role="columnheader">{cat}</th>
            ))}
            <th className="px-2 py-1 text-right" role="columnheader">Auto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isNonWorkDay = row.dayType !== 'WorkDay'
            return (
              <tr
                key={row.date}
                role="row"
                aria-label={row.date}
                className={isNonWorkDay ? 'opacity-50' : ''}
              >
                <td className="px-2 py-1 font-mono">{row.date.slice(8)}</td>
                <WorkedHoursCell
                  date={row.date}
                  workedHours={row.workedHours}
                  repository={workWindowRepository}
                />
                <td className="w-px border-l border-gray-300"></td>
                {allCategories.map((cat) => (
                  <td key={cat} className="px-1 py-0.5">
                    <input
                      aria-label={`Hours for ${cat} on ${row.date}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={getCellValue(row, cat)}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [draftKey(row.date, cat)]: e.target.value }))
                      }
                      onBlur={() => handleBlur(row, cat)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      className="w-14 rounded border px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-right text-gray-400" data-testid="auto-category">
                  {row.autoCategoryHours > 0 ? row.autoCategoryHours : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="px-2 py-1">Total</td>
            <td className="px-2 py-1 text-right" data-testid="total-worked">{totalWorked.toFixed(2)}</td>
            <td className="w-px border-l border-gray-300"></td>
            {allCategories.map((cat) => {
              const catTotal = rows.reduce((sum, row) => sum + (row.entries[cat] ?? 0), 0)
              return (
                <td key={cat} className="px-2 py-1 text-right">
                  {catTotal > 0 ? catTotal.toFixed(2) : ''}
                </td>
              )
            })}
            <td className="px-2 py-1 text-right">
              {rows.reduce((sum, row) => sum + row.autoCategoryHours, 0).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
