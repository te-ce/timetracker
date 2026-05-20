import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntryRepository, WorkWindowRepository, DayConfirmationRepository } from '../repositories/types'
import type { DayType } from '../domain/dayType'
import { buildMonthGrid } from '../domain/monthGrid'
import { getAllCategories } from '../domain/categories'
import { WorkedHoursCell } from './WorkedHoursCell'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'
import type { MonthGridRow } from '../domain/monthGrid'

interface Props {
  year: number
  month: number
  timeEntryRepository: TimeEntryRepository
  workWindowRepository: WorkWindowRepository
  dayConfirmationRepository: DayConfirmationRepository
  autoCategory: string
  customCategories?: string[]
  categoryOrder?: string[]
  dayTypes?: Map<string, DayType>
  confirmedDays?: Set<string>
}

export function MonthGrid({ year, month, timeEntryRepository, workWindowRepository, dayConfirmationRepository, autoCategory, customCategories = [], categoryOrder, dayTypes = new Map(), confirmedDays = new Set() }: Props) {
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

  const { save: saveMutation, remove: deleteMutation } = useTimeEntryMutations(timeEntryRepository)

  const queryClient = useQueryClient()
  const gridConfirmMutation = useMutation({
    mutationFn: async (row: MonthGridRow) => {
      const autoHours = row.autoCategoryHours
      if (autoCategory && autoHours > 0) {
        const existing = entries.find((e) => e.date === row.date && e.category === autoCategory)
        await timeEntryRepository.save({
          id: existing?.id ?? crypto.randomUUID(),
          date: row.date,
          category: autoCategory,
          hours: (existing?.hours ?? 0) + autoHours,
        })
      }
      await dayConfirmationRepository.confirm(row.date)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmations'] })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmation'] })
    },
  })

  const gridUnconfirmMutation = useMutation({
    mutationFn: (date: string) => dayConfirmationRepository.unconfirm(date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmations'] })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmation'] })
    },
  })

  const rows = buildMonthGrid({
    year,
    month,
    timeEntries: entries,
    workWindows: windows,
    dayTypes,
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
    const manual = row.entries[category] ?? 0
    const autoHours = category === autoCategory ? row.autoCategoryHours : 0
    const val = manual + autoHours
    return val ? String(parseFloat(val.toFixed(2))) : ''
  }

  const allCategories = getAllCategories(customCategories, categoryOrder)
  const totalWorked = rows.reduce((sum, row) => sum + row.workedHours, 0)

  return (
    <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
      <table className="w-full text-sm border-collapse" role="table">
        <thead className="sticky top-0 z-20 bg-white shadow-sm">
          <tr>
            <th className="sticky left-0 z-30 bg-white px-2 py-1.5 text-left w-12 border-b">Day</th>
            <th className="sticky left-12 z-30 bg-white px-2 py-1.5 text-right w-16 border-b" role="columnheader">Worked</th>
            <th className="w-px border-l border-b border-gray-300"></th>
            {allCategories.map((cat) => (
              <th
                key={cat}
                className="px-1 py-1.5 text-right w-16 min-w-[4rem] max-w-[4rem] border-b"
                role="columnheader"
                title={cat}
              >
                <span className="block truncate text-xs">{cat}</span>
              </th>
            ))}
            <th className="px-1 py-1.5 text-center w-10 border-b border-l border-gray-200">
              <span className="text-xs">✓</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isNonWorkDay = row.dayType !== 'WorkDay'
            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
            return (
              <tr
                key={row.date}
                role="row"
                aria-label={row.date}
                className={`${rowBg} ${isNonWorkDay ? 'opacity-50' : ''}`}
              >
                <td className={`sticky left-0 z-10 px-2 py-1 font-mono text-xs ${rowBg}`}>{row.date.slice(8)}</td>
                <WorkedHoursCell
                  date={row.date}
                  workedHours={parseFloat(row.workedHours.toFixed(2))}
                  repository={workWindowRepository}
                  className={`sticky left-12 z-10 ${rowBg}`}
                />
                <td className="w-px border-l border-gray-200"></td>
                {allCategories.map((cat) => {
                  const isAutoTarget = cat === autoCategory
                  const hasAutoHours = isAutoTarget && row.autoCategoryHours > 0
                  const isDayConfirmed = confirmedDays.has(row.date)
                  return (
                    <td key={cat} className="px-0.5 py-0.5 w-16 min-w-[4rem] max-w-[4rem]">
                      {isDayConfirmed || (isAutoTarget && !row.entries[cat] && hasAutoHours) ? (
                        <span
                          className="inline-block w-full rounded px-1 py-0.5 text-right text-xs text-gray-400"
                          data-testid={isAutoTarget && !isDayConfirmed ? 'auto-category' : undefined}
                        >
                          {(() => {
                            const manual = row.entries[cat] ?? 0
                            const auto = isAutoTarget ? row.autoCategoryHours : 0
                            const val = manual + auto
                            return val ? parseFloat(val.toFixed(2)) : ''
                          })()}
                        </span>
                      ) : (
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
                          className={`w-full rounded border px-1 py-0.5 text-right text-xs ${hasAutoHours ? 'bg-indigo-50' : ''}`}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="px-0.5 py-0.5 w-10 text-center border-l border-gray-200">
                  {row.workedHours > 0 && !isNonWorkDay && (
                    confirmedDays.has(row.date) ? (
                      <button
                        aria-label={`Unconfirm ${row.date}`}
                        onClick={() => gridUnconfirmMutation.mutate(row.date)}
                        className="text-emerald-600 text-xs font-bold hover:text-emerald-800"
                        title="Confirmed — click to undo"
                      >✓</button>
                    ) : (
                      <button
                        aria-label={`Confirm ${row.date}`}
                        onClick={() => gridConfirmMutation.mutate(row)}
                        className="text-gray-300 text-xs hover:text-gray-600"
                        title="Confirm day"
                      >○</button>
                    )
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-20 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
          <tr className="border-t font-semibold">
            <td className="sticky left-0 z-30 bg-white px-2 py-1">Total</td>
            <td className="sticky left-12 z-30 bg-white px-2 py-1 text-right" data-testid="total-worked">{totalWorked.toFixed(2)}</td>
            <td className="w-px border-l border-gray-300"></td>
            {allCategories.map((cat) => {
              const catTotal = rows.reduce((sum, row) => {
                const manual = row.entries[cat] ?? 0
                const autoHours = cat === autoCategory ? row.autoCategoryHours : 0
                return sum + manual + autoHours
              }, 0)
              return (
                <td key={cat} className="px-1 py-1 text-right text-xs w-16 min-w-[4rem] max-w-[4rem]">
                  {catTotal > 0 ? catTotal.toFixed(2) : ''}
                </td>
              )
            })}
            <td className="w-10 border-l border-gray-200"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
