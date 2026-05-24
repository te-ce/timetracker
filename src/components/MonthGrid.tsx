import { useState, useRef, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  TimeEntryRepository,
  WorkPeriodRepository,
  DayConfirmationRepository,
  DayTypeOverrideRepository,
  WorkLocationRepository,
  WorkLocation,
} from '../repositories/types'
import type { DayType } from '../domain/dayType'
import { isDayTypeOverride } from '../domain/dayType'
import { classifyDay } from '../domain/dayStatus'
import { buildMonthGrid } from '../domain/monthGrid'
import { getAllCategories } from '../domain/categories'
import { WorkedHoursCell } from './WorkedHoursCell'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { toLocalIso } from '../domain/dateUtils'
import type { MonthGridRow } from '../domain/monthGrid'
import { STATUS_DOT, STATUS_ROW_BG, STATUS_LABEL } from '../domain/statusColors'
import type { DisplayStatus } from '../domain/statusColors'
import { StatusLegend } from './StatusLegend'


const TODAY_ROW_BG: [string, string] = ['bg-amber-50', 'bg-amber-100/70']

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
  onAutoCategoryChange?: (category: string) => void
  onSelectDate?: (isoDate: string) => void
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
  displayStatus: DisplayStatus
  reason: string
}

function computeSprintGroups(
  rows: MonthGridRow[],
  sprintStartDate: string | null,
  sprintLengthDays: number,
): SprintGroup[] {
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
        groups.push({
          label: `Sprint ${currentSprintIdx! + 1}`,
          rows: currentRows,
        })
      }
      currentRows = [row]
      currentSprintIdx = sprintIdx
    } else {
      currentRows.push(row)
    }
  }
  if (currentRows.length > 0) {
    groups.push({
      label: `Sprint ${currentSprintIdx! + 1}`,
      rows: currentRows,
    })
  }

  return groups
}

export function MonthGrid({
  year,
  month,
  timeEntryRepository,
  workPeriodRepository,
  dayConfirmationRepository,
  dayTypeOverrideRepository,
  workLocationRepository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  dayTypes = new Map(),
  confirmedDays = new Set(),
  sprintStartDate = null,
  sprintLengthDays = 14,
  workLocations = new Map(),
  defaultWorkLocation = null,
  onCategoryReorder,
  onCategoryRename,
  onAutoCategoryChange,
  onSelectDate,
}: Props) {
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
      if (popoverRef.current && e.target instanceof Node && !popoverRef.current.contains(e.target)) {
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
    queryKey: QUERY_KEYS.timeEntriesByMonth(year, month),
    queryFn: () => timeEntryRepository.findByDateRange(from, to),
  })

  const { data: windows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByMonth(year, month),
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationsAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationAll })
    },
  })

  const gridUnconfirmMutation = useMutation({
    mutationFn: (date: string) => dayConfirmationRepository.unconfirm(date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationsAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationAll })
    },
  })

  const dayTypeMutation = useMutation({
    mutationFn: async ({ date, value }: { date: string; value: string }) => {
      if (value === 'WorkDay') {
        await dayTypeOverrideRepository.delete(date)
      } else {
        if (isDayTypeOverride(value)) await dayTypeOverrideRepository.save(date, value)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayTypeOverridesAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayTypeOverrideAll })
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workLocationsAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workLocationAll })
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

  function clearCell(date: string, category: string) {
    const existing = entries.find((e) => e.date === date && e.category === category)
    if (existing) deleteMutation.mutate(existing.id)
    setDrafts((d) => {
      const next = { ...d }
      delete next[draftKey(date, category)]
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

  function classifyRow(row: MonthGridRow) {
    const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
    return classifyDay({
      dayType: row.dayType,
      workedHours: row.workedHours,
      manualTotal,
      isEntriesBalanced: row.workedHours > 0 && Math.abs(row.workedHours - manualTotal) < 0.01,
      hasAutoCategory: !!autoCategory && manualTotal <= row.workedHours,
      isConfirmed: confirmedDays.has(row.date),
      isoDate: row.date,
      today: todayIso,
    })
  }

  function getDisplayStatus(row: MonthGridRow): DisplayStatus {
    return classifyRow(row).displayStatus
  }

  function cycleLocation(date: string) {
    const effective: WorkLocation = workLocations.get(date) ?? defaultWorkLocation ?? 'Remote'
    const next: WorkLocation = effective === 'Remote' ? 'Office' : 'Remote'
    locationMutation.mutate({ date, location: next })
  }

  function handleDotClick(e: React.MouseEvent<HTMLButtonElement>, row: MonthGridRow) {
    const rect = e.currentTarget.getBoundingClientRect()
    const currentDayType = row.dayType === 'Weekend' ? 'WorkDay' : (dayTypes.get(row.date) ?? 'WorkDay')
    const { displayStatus, reason } = classifyRow(row)
    setDotPopover({
      date: row.date,
      currentDayType,
      top: rect.bottom + 6,
      left: rect.left,
      displayStatus,
      reason,
    })
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

  // day + status + worked + location + separator + categories + confirm
  const colCount = allCategories.length + 6

  let globalRowIdx = 0

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
        <table className="w-full text-sm border-collapse" role="table">
          <thead className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-white dark:bg-gray-800 px-2 py-1.5 text-left w-12 border-b dark:border-gray-700">Day</th>
              <th className="sticky left-12 z-30 bg-white dark:bg-gray-800 px-1 py-1.5 w-5 border-b dark:border-gray-700" title="Status"></th>
              <th
                className="sticky left-[4.25rem] z-30 bg-white dark:bg-gray-800 px-2 py-1.5 text-right w-16 border-b dark:border-gray-700"
                role="columnheader"
              >
                Worked
              </th>
              <th className="px-1 py-1.5 text-center w-10 border-b dark:border-gray-700 text-xs border-l border-gray-200 dark:border-l-gray-700">📍</th>
              <th className="w-px border-l border-b border-gray-300 dark:border-gray-600"></th>
              {allCategories.map((cat, catIdx) => (
                <th
                  key={cat}
                  draggable={editingCat !== cat && !!onCategoryReorder}
                  onDragStart={() => handleColDragStart(catIdx)}
                  onDragOver={(e) => handleColDragOver(e, catIdx)}
                  onDrop={() => handleColDrop(catIdx, allCategories)}
                  onDragEnd={handleColDragEnd}
                  className={`px-1 py-1.5 text-right w-16 min-w-[4rem] max-w-[4rem] border-b dark:border-gray-700 select-none ${onCategoryReorder ? 'cursor-grab active:cursor-grabbing' : ''} ${colDragOverIdx === catIdx ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
                  role="columnheader"
                  title={
                    cat === autoCategory
                      ? `${cat} — auto category (absorbs remaining hours)`
                      : onCategoryRename
                        ? 'Double-click to rename'
                        : cat
                  }
                >
                  {editingCat === cat ? (
                    <input
                      ref={(el) => {
                        el?.focus()
                      }}
                      type="text"
                      aria-label={`Rename category ${cat}`}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitRename(cat)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(cat)
                        if (e.key === 'Escape') setEditingCat(null)
                      }}
                      className="w-full bg-transparent text-xs border-b border-indigo-400 dark:border-indigo-500 focus:outline-none text-left"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`block truncate text-xs ${onCategoryRename ? 'cursor-text' : ''}`}
                      onDoubleClick={() => {
                        if (onCategoryRename) {
                          setEditingCat(cat)
                          setEditValue(cat)
                        }
                      }}
                    >
                      {cat}
                    </span>
                  )}
                  {/* Fixed-height badge row keeps all headers the same height */}
                  <span aria-hidden="true" className="flex justify-center items-center h-[13px] mt-0.5">
                    {cat === autoCategory ? (
                      <span className="text-[9px] text-indigo-400 dark:text-indigo-300 font-medium tracking-wide leading-none">auto</span>
                    ) : onAutoCategoryChange ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAutoCategoryChange(cat)
                        }}
                        className="text-[9px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-300 leading-none transition-colors"
                        title={`Set "${cat}" as auto category`}
                      >
                        ○
                      </button>
                    ) : (
                      <span className="text-[9px] leading-none">&nbsp;</span>
                    )}
                  </span>
                </th>
              ))}
              <th className="px-1 py-1.5 text-center w-10 border-b border-l border-gray-200 dark:border-gray-700">
                <span className="text-xs">✓</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sprintGroups.map((group) => {
              const sprintWorked = group.rows.reduce((s, r) => s + r.workedHours, 0)
              const groupRows = group.rows.map((row) => {
                const isNonWorkDay = row.dayType !== 'WorkDay'
                const isToday = row.date === todayIso
                const displayStatus = getDisplayStatus(row)
                const bgPair = isToday ? TODAY_ROW_BG : STATUS_ROW_BG[displayStatus]
                const rowBg = bgPair[globalRowIdx % 2]
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
                    <td className={`sticky left-0 z-10 px-2 py-1 font-mono text-xs ${rowBg}`}>
                      {onSelectDate ? (
                        <button
                          onClick={() => onSelectDate(row.date)}
                          className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                          title={`Open ${row.date}`}
                        >
                          {row.date.slice(8)}
                          <span className="text-gray-400 dark:text-gray-500 ml-0.5">{dayLabel}</span>
                        </button>
                      ) : (
                        <span title={row.date}>
                          {row.date.slice(8)}
                          <span className="text-gray-400 dark:text-gray-500 ml-0.5">{dayLabel}</span>
                        </span>
                      )}
                    </td>
                    <td className={`sticky left-12 z-10 px-1 py-1 ${rowBg}`}>
                      <button
                        onClick={(e) => handleDotClick(e, row)}
                        className="inline-flex items-center justify-center rounded-full hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-label={`Day status: ${displayStatus}. Click to change day type.`}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[displayStatus]}`} />
                      </button>
                    </td>
                    <WorkedHoursCell
                      date={row.date}
                      workedHours={parseFloat(row.workedHours.toFixed(2))}
                      repository={workPeriodRepository}
                      className={`sticky left-[4.25rem] z-10 ${rowBg}`}
                    />
                    <td className="px-0 py-0 w-10 text-center border-l border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => cycleLocation(row.date)}
                        className="w-full h-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700 py-1"
                        aria-label={`Location ${row.date}`}
                        title={loc}
                      >
                        {loc === 'Office' ? '🏢' : '🏠'}
                      </button>
                    </td>
                    <td className="w-px border-l border-gray-200 dark:border-gray-700"></td>
                    {allCategories.map((cat) => {
                      const isAutoTarget = cat === autoCategory
                      const hasAutoHours = isAutoTarget && row.autoCategoryHours > 0
                      const isDayConfirmed = confirmedDays.has(row.date)
                      return (
                        <td key={cat} className="px-0.5 py-0.5 w-16 min-w-[4rem] max-w-[4rem]">
                          {isDayConfirmed || (isAutoTarget && !row.entries[cat] && hasAutoHours) ? (
                            <span
                              className="inline-block w-full rounded px-1 py-0.5 text-right text-xs text-gray-400 dark:text-gray-500"
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
                            <div className="relative group/cell">
                              <input
                                aria-label={`Hours for ${cat} on ${row.date}`}
                                type="number"
                                min="0"
                                step="0.5"
                                value={getCellValue(row, cat)}
                                onChange={(e) =>
                                  setDrafts((d) => ({
                                    ...d,
                                    [draftKey(row.date, cat)]: e.target.value,
                                  }))
                                }
                                onBlur={() => handleBlur(row, cat)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.target.blur()
                                }}
                                className={`w-full rounded border px-1 py-0.5 text-right text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${hasAutoHours ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
                              />
                              {getCellValue(row, cat) !== '' && (
                                <button
                                  onClick={() => clearCell(row.date, cat)}
                                  aria-label={`Clear ${cat} on ${row.date}`}
                                  className="absolute -top-1.5 -right-1.5 z-10 hidden group-hover/cell:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-[9px] font-bold text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 leading-none"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td
                      className={`w-10 text-center border-l border-gray-200 dark:border-gray-700 ${!isNonWorkDay ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isNonWorkDay) return
                        if (confirmedDays.has(row.date)) {
                          gridUnconfirmMutation.mutate(row.date)
                        } else {
                          gridConfirmMutation.mutate(row)
                        }
                      }}
                      aria-label={confirmedDays.has(row.date) ? `Unconfirm ${row.date}` : `Confirm ${row.date}`}
                      title={confirmedDays.has(row.date) ? 'Confirmed — click to undo' : 'Confirm day'}
                    >
                      {!isNonWorkDay && (
                        <span
                          className={`text-xs font-bold ${confirmedDays.has(row.date) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}
                        >
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
                    <tr className="bg-indigo-50/60 dark:bg-indigo-900/20">
                      <td colSpan={colCount} className="px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border-b dark:border-gray-700">
                        {group.label}
                      </td>
                    </tr>
                  )}
                  {groupRows}
                  {group.label && (
                    <tr className="bg-indigo-50/40 dark:bg-indigo-900/20 border-t dark:border-gray-700">
                      <td className="sticky left-0 z-10 bg-indigo-50/40 dark:bg-indigo-900/20 px-2 py-0.5 text-xs font-medium">
                        {group.label} Total
                      </td>
                      <td className="sticky left-12 z-10 bg-indigo-50/40 dark:bg-indigo-900/20"></td>
                      <td className="sticky left-[4.25rem] z-10 bg-indigo-50/40 dark:bg-indigo-900/20 px-2 py-0.5 text-right text-xs font-medium">
                        {sprintWorked.toFixed(2)}
                      </td>
                      <td></td>
                      <td className="w-px border-l border-gray-200 dark:border-gray-700"></td>
                      {allCategories.map((cat) => {
                        const catTotal = group.rows.reduce((sum, row) => {
                          const manual = row.entries[cat] ?? 0
                          const autoHours = cat === autoCategory ? row.autoCategoryHours : 0
                          return sum + manual + autoHours
                        }, 0)
                        return (
                          <td
                            key={cat}
                            className="px-1 py-0.5 text-right text-xs w-16 min-w-[4rem] max-w-[4rem] font-medium"
                          >
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
          <tfoot className="sticky bottom-0 z-20 bg-white dark:bg-gray-800 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <tr className="border-t dark:border-gray-700 font-semibold">
              <td className="sticky left-0 z-30 bg-white dark:bg-gray-800 px-2 py-1">Total</td>
              <td className="sticky left-12 z-30 bg-white dark:bg-gray-800"></td>
              <td className="sticky left-[4.25rem] z-30 bg-white dark:bg-gray-800 px-2 py-1 text-right" data-testid="total-worked">
                {totalWorked.toFixed(2)}
              </td>
              <td></td>
              <td className="w-px border-l border-gray-300 dark:border-gray-600"></td>
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
              <td className="w-10 border-l border-gray-200 dark:border-gray-700"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status legend */}
      <StatusLegend className="px-1" />

      {/* Status dot popover — fixed, outside overflow container */}
      {dotPopover && (
        <div
          ref={popoverRef}
          style={{ top: dotPopover.top, left: dotPopover.left }}
          className="fixed z-[300] w-52 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
        >
          {/* Status name + reason */}
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[dotPopover.displayStatus]}`} aria-hidden="true" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{STATUS_LABEL[dotPopover.displayStatus]}</span>
          </div>
          <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">{dotPopover.reason}</p>

          {/* Day type selector */}
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Day type</p>
          <div className="flex flex-wrap gap-1">
            {DAY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDayTypeSelect(opt.value)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  dotPopover.currentDayType === opt.value
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
