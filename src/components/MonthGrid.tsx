import { useState, useRef, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntryRepository, WorkPeriodRepository, DayConfirmationRepository, DayTypeOverrideRepository, WorkLocationRepository, DayTypeOverride, WorkLocation } from '../repositories/types'
import type { DayType } from '../domain/dayType'
import type { DayStatus } from '../domain/dayStatus'
import { getDayStatus } from '../domain/dayStatus'
import { buildMonthGrid } from '../domain/monthGrid'
import { getAllCategories } from '../domain/categories'
import { WorkedHoursCell } from './WorkedHoursCell'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'
import { toLocalIso } from '../domain/dateUtils'
import type { MonthGridRow } from '../domain/monthGrid'

const STATUS_DOT: Record<DayStatus, string> = {
  'complete': 'bg-emerald-400',
  'incomplete': 'bg-amber-400',
  'untracked': 'bg-blue-400',
  'today': 'bg-indigo-400',
  'future': 'bg-gray-300',
  'non-working': 'bg-gray-300',
  'leave': 'bg-purple-400',
}

const STATUS_LEGEND: Array<{ color: string; label: string }> = [
  { color: 'bg-emerald-400', label: 'Confirmed / balanced' },
  { color: 'bg-amber-400', label: 'Logged, needs balancing' },
  { color: 'bg-blue-400', label: 'No hours logged' },
  { color: 'bg-indigo-400', label: 'Today' },
  { color: 'bg-purple-400', label: 'Vacation / sick / absence' },
  { color: 'bg-gray-300', label: 'Future / non-working' },
]

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'Work Day' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'Sick Day' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
  { value: 'Absence', label: 'Absence' },
]

interface Props {
  year: number
  month: number
  timeEntryRepository: TimeEntryRepository
  workPeriodRepository: WorkPeriodRepository
  dayConfirmationRepository: DayConfirmationRepository
  dayTypeOverrideRepository: DayTypeOverrideRepository
  workLocationRepository: WorkLocationRepository
  autoCategory: string
  customCategories?: string[]
  categoryOrder?: string[]
  dayTypes?: Map<string, DayType>
  confirmedDays?: Set<string>
  sprintStartDate?: string | null
  sprintLengthDays?: number
  workLocations?: Map<string, WorkLocation>
  defaultWorkLocation?: WorkLocation | null
  onCategoryReorder?: (order: string[]) => void
  onCategoryRename?: (oldName: string, newName: string) => void
}

interface SprintGroup {
  label: string
  rows: MonthGridRow[]
}

interface DotPopoverState {
  date: string
  currentDayType: string
  top: number
  left: number
}

function computeSprintGroups(rows: MonthGridRow[], sprintStartDate: string | null, sprintLengthDays: number): SprintGroup[] {
  if (!sprintStartDate || sprintLengthDays <= 0) {
    return [{ label: '', rows }]
  }

  const sprintStart = new Date(sprintStartDate)
  const groups: SprintGroup[] = []
  let currentRows: MonthGridRow[] = []
  let currentSprintIdx: number | null = null

  for (const row of rows) {
    const rowDate = new Date(row.date)
    const diffMs = rowDate.getTime() - sprintStart.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const sprintIdx = Math.floor(diffDays / sprintLengthDays)

    if (currentSprintIdx === null || sprintIdx !== currentSprintIdx) {
      if (currentRows.length > 0) {
        groups.push({ label: `Sprint ${currentSprintIdx! + 1}`, rows: currentRows })
      }
      currentRows = [row]
      currentSprintIdx = sprintIdx
    } else {
      currentRows.push(row)
    }
  }
  if (currentRows.length > 0) {
    groups.push({ label: `Sprint ${currentSprintIdx! + 1}`, rows: currentRows })
  }

  return groups
}

export function MonthGrid({ year, month, timeEntryRepository, workPeriodRepository, dayConfirmationRepository, dayTypeOverrideRepository, workLocationRepository, autoCategory, customCategories = [], categoryOrder, dayTypes = new Map(), confirmedDays = new Set(), sprintStartDate = null, sprintLengthDays = 14, workLocations = new Map(), defaultWorkLocation = null, onCategoryReorder, onCategoryRename }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({})
  const [dotPopover, setDotPopover] = useState<DotPopoverState | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const colDragIdx = useRef<number | null>(null)
  const [colDragOverIdx, setColDragOverIdx] = useState<number | null>(null)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const todayIso = toLocalIso(new Date())

  useEffect(() => {
    if (!dotPopover) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setDotPopover(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDotPopover(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dotPopover])

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', year, month],
    queryFn: () => timeEntryRepository.findByDateRange(from, to),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', year, month],
    queryFn: () => workPeriodRepository.findByDateRange(from, to),
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

  const dayTypeMutation = useMutation({
    mutationFn: async ({ date, value }: { date: string; value: string }) => {
      if (value === 'WorkDay') {
        await dayTypeOverrideRepository.delete(date)
      } else {
        await dayTypeOverrideRepository.save(date, value as DayTypeOverride)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dayTypeOverrides'] })
      void queryClient.invalidateQueries({ queryKey: ['dayTypeOverride'] })
    },
  })

  const locationMutation = useMutation({
    mutationFn: async ({ date, location }: { date: string; location: WorkLocation | null }) => {
      if (location) {
        await workLocationRepository.save(date, location)
      } else {
        await workLocationRepository.delete(date)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workLocations'] })
      void queryClient.invalidateQueries({ queryKey: ['workLocation'] })
    },
  })

  const rows = buildMonthGrid({
    year,
    month,
    timeEntries: entries,
    workPeriods: windows,
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

  function getRowStatus(row: MonthGridRow): DayStatus {
    const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
    return getDayStatus({
      dayType: row.dayType,
      hasWorkedHours: row.workedHours > 0,
      isEntriesBalanced: row.workedHours > 0 && Math.abs(row.workedHours - manualTotal) < 0.01,
      hasAutoCategory: !!autoCategory,
      isConfirmed: confirmedDays.has(row.date),
      isoDate: row.date,
      today: todayIso,
    })
  }

  function cycleLocation(date: string) {
    const effective: WorkLocation = workLocations.get(date) ?? defaultWorkLocation ?? 'Remote'
    const next: WorkLocation = effective === 'Remote' ? 'Office' : 'Remote'
    locationMutation.mutate({ date, location: next })
  }

  function handleDotClick(e: React.MouseEvent<HTMLButtonElement>, row: MonthGridRow) {
    const rect = e.currentTarget.getBoundingClientRect()
    const currentDayType = row.dayType === 'Weekend' ? 'WorkDay' : (dayTypes.get(row.date) ?? 'WorkDay')
    setDotPopover({ date: row.date, currentDayType, top: rect.bottom + 6, left: rect.left })
  }

  function handleDayTypeSelect(value: string) {
    if (!dotPopover) return
    dayTypeMutation.mutate({ date: dotPopover.date, value })
    setDotPopover(null)
  }

  function handleColDragStart(idx: number) {
    colDragIdx.current = idx
  }

  function handleColDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setColDragOverIdx(idx)
  }

  function handleColDrop(idx: number, categories: string[]) {
    const from = colDragIdx.current
    if (from === null || from === idx) {
      colDragIdx.current = null
      setColDragOverIdx(null)
      return
    }
    const newOrder = [...categories]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(idx, 0, moved)
    onCategoryReorder?.(newOrder)
    colDragIdx.current = null
    setColDragOverIdx(null)
  }

  function handleColDragEnd() {
    colDragIdx.current = null
    setColDragOverIdx(null)
  }

  function commitRename(oldName: string) {
    const newName = editValue.trim()
    setEditingCat(null)
    if (newName && newName !== oldName) {
      onCategoryRename?.(oldName, newName)
    }
  }

  const allCategories = getAllCategories(customCategories, categoryOrder)
  const totalWorked = rows.reduce((sum, row) => sum + row.workedHours, 0)
  const sprintGroups = computeSprintGroups(rows, sprintStartDate, sprintLengthDays)

  // Office percentage
  const workDaysWithLocation = rows.filter((r) => r.dayType === 'WorkDay' && r.workedHours > 0)
  const officeDays = workDaysWithLocation.filter((r) => workLocations.get(r.date) === 'Office').length
  const officePercent = workDaysWithLocation.length > 0 ? Math.round((officeDays / workDaysWithLocation.length) * 100) : 0

  // day + status + worked + location + separator + categories + confirm
  const colCount = allCategories.length + 6

  let globalRowIdx = 0

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-gray-500">
        🏢 Office: {officePercent}% ({officeDays}/{workDaysWithLocation.length} days)
      </div>
      <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
        <table className="w-full text-sm border-collapse" role="table">
          <thead className="sticky top-0 z-20 bg-white shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-white px-2 py-1.5 text-left w-12 border-b">Day</th>
              <th className="sticky left-12 z-30 bg-white px-1 py-1.5 w-5 border-b" title="Status"></th>
              <th className="sticky left-[4.25rem] z-30 bg-white px-2 py-1.5 text-right w-16 border-b" role="columnheader">Worked</th>
              <th className="px-1 py-1.5 text-center w-10 border-b text-xs border-l border-gray-200">📍</th>
              <th className="w-px border-l border-b border-gray-300"></th>
              {allCategories.map((cat, catIdx) => (
                <th
                  key={cat}
                  draggable={editingCat !== cat && !!onCategoryReorder}
                  onDragStart={() => handleColDragStart(catIdx)}
                  onDragOver={(e) => handleColDragOver(e, catIdx)}
                  onDrop={() => handleColDrop(catIdx, allCategories)}
                  onDragEnd={handleColDragEnd}
                  className={`px-1 py-1.5 text-right w-16 min-w-[4rem] max-w-[4rem] border-b select-none ${onCategoryReorder ? 'cursor-grab active:cursor-grabbing' : ''} ${colDragOverIdx === catIdx ? 'bg-indigo-50' : ''}`}
                  role="columnheader"
                  title={onCategoryRename ? 'Double-click to rename' : cat}
                >
                  {editingCat === cat ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitRename(cat)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(cat)
                        if (e.key === 'Escape') setEditingCat(null)
                      }}
                      className="w-full bg-transparent text-xs border-b border-indigo-400 focus:outline-none text-left"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`block truncate text-xs ${onCategoryRename ? 'cursor-text' : ''}`}
                      onDoubleClick={() => { if (onCategoryRename) { setEditingCat(cat); setEditValue(cat) } }}
                    >
                      {cat}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-1 py-1.5 text-center w-10 border-b border-l border-gray-200">
                <span className="text-xs">✓</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sprintGroups.map((group) => {
              const sprintWorked = group.rows.reduce((s, r) => s + r.workedHours, 0)
              const groupRows = group.rows.map((row) => {
                const isNonWorkDay = row.dayType !== 'WorkDay'
                const rowBg = globalRowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
                const status = getRowStatus(row)
                const loc: WorkLocation = workLocations.get(row.date) ?? defaultWorkLocation ?? 'Remote'
                const dayLabel = new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)
                globalRowIdx++
                return (
                  <tr
                    key={row.date}
                    role="row"
                    aria-label={row.date}
                    className={`${rowBg} ${isNonWorkDay ? 'opacity-50' : ''}`}
                  >
                    <td className={`sticky left-0 z-10 px-2 py-1 font-mono text-xs ${rowBg}`} title={row.date}>
                      {row.date.slice(8)}<span className="text-gray-400 ml-0.5">{dayLabel}</span>
                    </td>
                    <td className={`sticky left-12 z-10 px-1 py-1 ${rowBg}`}>
                      <button
                        onClick={(e) => handleDotClick(e, row)}
                        className="inline-flex items-center justify-center rounded-full hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-label={`Day status: ${status}. Click to change day type.`}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                      </button>
                    </td>
                    <WorkedHoursCell
                      date={row.date}
                      workedHours={parseFloat(row.workedHours.toFixed(2))}
                      repository={workPeriodRepository}
                      className={`sticky left-[4.25rem] z-10 ${rowBg}`}
                    />
                    <td className="px-0 py-0 w-10 text-center border-l border-gray-200">
                      <button
                        onClick={() => cycleLocation(row.date)}
                        className="w-full h-full text-xs hover:bg-gray-100 py-1"
                        aria-label={`Location ${row.date}`}
                        title={loc ?? 'Not set'}
                      >
                        {loc === 'Office' ? '🏢' : '🏠'}
                      </button>
                    </td>
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
                    <td
                      className={`w-10 text-center border-l border-gray-200 ${!isNonWorkDay ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isNonWorkDay) return
                        confirmedDays.has(row.date)
                          ? gridUnconfirmMutation.mutate(row.date)
                          : gridConfirmMutation.mutate(row)
                      }}
                      aria-label={confirmedDays.has(row.date) ? `Unconfirm ${row.date}` : `Confirm ${row.date}`}
                      title={confirmedDays.has(row.date) ? 'Confirmed — click to undo' : 'Confirm day'}
                    >
                      {!isNonWorkDay && (
                        <span className={`text-xs font-bold ${confirmedDays.has(row.date) ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {confirmedDays.has(row.date) ? '✓' : '○'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })

              return (
                <Fragment key={group.label}>
                  {group.label && (
                    <tr className="bg-indigo-50/60">
                      <td colSpan={colCount} className="px-2 py-1 text-xs font-semibold text-indigo-700 border-b">
                        {group.label}
                      </td>
                    </tr>
                  )}
                  {groupRows}
                  {group.label && (
                    <tr className="bg-indigo-50/40 border-t">
                      <td className="sticky left-0 z-10 bg-indigo-50/40 px-2 py-0.5 text-xs font-medium">{group.label} Total</td>
                      <td className="sticky left-12 z-10 bg-indigo-50/40"></td>
                      <td className="sticky left-[4.25rem] z-10 bg-indigo-50/40 px-2 py-0.5 text-right text-xs font-medium">{sprintWorked.toFixed(2)}</td>
                      <td></td>
                      <td className="w-px border-l border-gray-200"></td>
                      {allCategories.map((cat) => {
                        const catTotal = group.rows.reduce((sum, row) => {
                          const manual = row.entries[cat] ?? 0
                          const autoHours = cat === autoCategory ? row.autoCategoryHours : 0
                          return sum + manual + autoHours
                        }, 0)
                        return (
                          <td key={cat} className="px-1 py-0.5 text-right text-xs w-16 min-w-[4rem] max-w-[4rem] font-medium">
                            {catTotal > 0 ? catTotal.toFixed(2) : ''}
                          </td>
                        )
                      })}
                      <td></td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <tr className="border-t font-semibold">
              <td className="sticky left-0 z-30 bg-white px-2 py-1">Total</td>
              <td className="sticky left-12 z-30 bg-white"></td>
              <td className="sticky left-[4.25rem] z-30 bg-white px-2 py-1 text-right" data-testid="total-worked">{totalWorked.toFixed(2)}</td>
              <td></td>
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

      {/* Status dot popover — fixed, outside overflow container */}
      {dotPopover && (
        <div
          ref={popoverRef}
          style={{ top: dotPopover.top, left: dotPopover.left }}
          className="fixed z-[300] w-52 rounded-lg border bg-white p-3 shadow-lg"
        >
          {/* Color legend */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Status legend</p>
          <ul className="mb-3 flex flex-col gap-1">
            {STATUS_LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                {item.label}
              </li>
            ))}
          </ul>

          {/* Day type selector */}
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Day type</p>
          <div className="flex flex-wrap gap-1">
            {DAY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDayTypeSelect(opt.value)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  dotPopover.currentDayType === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
