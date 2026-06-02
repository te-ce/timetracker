import { useState, useRef, Fragment, useCallback } from 'react'
import { useCloseOnOutsideClickOrEscape } from '../hooks/useCloseOnOutsideClickOrEscape'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, WorkLocation } from '../repositories/types'
import type { DayType } from '../domain/dayType'
import { isDayTypeOverride } from '../domain/dayType'
import { classifyDay } from '../domain/dayStatus'
import { buildMonthGrid } from '../domain/monthGrid'
import { getAllCategories } from '../domain/categories'
import { computeSprintGroups } from '../domain/sprintGroups'
import { WorkedHoursCell } from './WorkedHoursCell'
import { CategoryColumnHeader, type ColumnDragHandlers } from './CategoryColumnHeader'
import { DotPopoverPanel } from './DotPopoverPanel'
import { NotePopoverPanel } from './NotePopoverPanel'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { toLocalIso } from '../domain/dateUtils'
import type { MonthGridRow } from '../domain/monthGrid'
import type { DotPopoverState } from './DotPopoverPanel'
import type { NotePopoverState } from './NotePopoverPanel'
import { STATUS_DOT, STATUS_ROW_BG } from '../domain/statusColors'
import { StatusLegend } from './StatusLegend'

const TODAY_ROW_BG: [string, string] = ['bg-amber-50', 'bg-amber-100/70']

async function confirmDayInRepo(repository: MonthRepository, date: string, autoHours: number, autoCategory: string): Promise<void> {
  await repository.updateDay(date, (day) => {
    const existing = day.entries.find((e) => e.category === autoCategory)
    const confirmed = {
      id: existing?.id ?? crypto.randomUUID(),
      category: autoCategory,
      hours: (existing?.hours ?? 0) + autoHours,
    }
    const filtered = day.entries.filter((e) => e.id !== confirmed.id)
    return { ...day, entries: [...filtered, confirmed], confirmed: true }
  })
}

function saveDayTypeInRepo(repository: MonthRepository, date: string, value: string): Promise<void> {
  if (value === 'WorkDay') {
    return repository.updateDay(date, (day) => {
      const updated = { ...day }
      delete updated.dayTypeOverride
      return updated
    })
  }
  if (isDayTypeOverride(value)) {
    return repository.updateDay(date, (day) => ({ ...day, dayTypeOverride: value }))
  }
  return Promise.resolve()
}

function classifyRow(
  row: MonthGridRow,
  autoCategory: string | null,
  confirmedDays: Set<string>,
  today: string,
) {
  const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
  return classifyDay({
    dayType: row.dayType,
    workedHours: row.workedHours,
    manualTotal,
    isEntriesBalanced: row.workedHours > 0 && Math.abs(row.workedHours - manualTotal) < 0.01,
    hasAutoCategory: !!autoCategory && manualTotal <= row.workedHours,
    isConfirmed: confirmedDays.has(row.date),
    isoDate: row.date,
    today,
  })
}

interface Props {
  year: number
  month: number
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[]
  categoryOrder?: string[]
  dayTypes?: Map<string, DayType>
  confirmedDays?: Set<string>
  sprintStartDate?: string | null
  sprintLengthDays?: number
  workLocations?: Map<string, WorkLocation>
  defaultWorkLocation?: WorkLocation | null
  categoryDescriptions?: Record<string, string>
  dayNotes?: Map<string, string>
  onCategoryReorder?: (order: string[]) => void
  onCategoryRename?: (oldName: string, newName: string) => void
  onAutoCategoryChange?: (category: string) => void
  onNoteChange?: (date: string, note: string) => void
  onSelectDate?: (isoDate: string) => void
}


function resolveWorkLocation(
  workLocations: Map<string, WorkLocation>,
  date: string,
  defaultWorkLocation: WorkLocation | null,
): WorkLocation {
  const stored = workLocations.get(date)
  if (stored !== undefined) return stored
  if (defaultWorkLocation !== null) return defaultWorkLocation
  return 'Remote'
}

interface ConfirmCellProps {
  date: string
  isNonWorkDay: boolean
  isConfirmed: boolean
  onConfirm: () => void
  onUnconfirm: () => void
}

function ConfirmCell({ date, isNonWorkDay, isConfirmed, onConfirm, onUnconfirm }: ConfirmCellProps) {
  const confirmLabel = isConfirmed ? `Unconfirm ${date}` : `Confirm ${date}`
  const confirmTitle = isConfirmed ? 'Confirmed — click to undo' : 'Confirm day'
  return (
    <td
      className={`w-10 text-center border-l border-gray-200 dark:border-gray-700 ${!isNonWorkDay ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (isNonWorkDay) return
        if (isConfirmed) { onUnconfirm() } else { onConfirm() }
      }}
      aria-label={confirmLabel}
      title={confirmTitle}
    >
      {!isNonWorkDay && (
        <span className={`text-xs font-bold ${isConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}>
          {isConfirmed ? '✓' : '○'}
        </span>
      )}
    </td>
  )
}


export function MonthGrid({
  year,
  month,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  dayTypes = new Map(),
  confirmedDays = new Set(),
  sprintStartDate = null,
  sprintLengthDays = 14,
  workLocations = new Map(),
  defaultWorkLocation = null,
  categoryDescriptions,
  dayNotes = new Map(),
  onCategoryReorder,
  onCategoryRename,
  onAutoCategoryChange,
  onNoteChange,
  onSelectDate,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({})
  const [dotPopover, setDotPopover] = useState<DotPopoverState | null>(null)
  const [notePopover, setNotePopover] = useState<NotePopoverState | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const notePopoverRef = useRef<HTMLDivElement>(null)
  const colDragIdx = useRef<number | null>(null)
  const [colDragOverIdx, setColDragOverIdx] = useState<number | null>(null)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const todayIso = toLocalIso(new Date())

  const closeDotPopover = useCallback(() => setDotPopover(null), [])
  const closeNotePopover = useCallback(() => setNotePopover(null), [])
  useCloseOnOutsideClickOrEscape(!!dotPopover, popoverRef, closeDotPopover, { escapeKey: true })
  useCloseOnOutsideClickOrEscape(!!notePopover, notePopoverRef, closeNotePopover)

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => repository.getMonth(year, month),
  })

  const { save: saveMutation, remove: deleteMutation } = useTimeEntryMutations(repository)

  const queryClient = useQueryClient()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
  }

  const gridConfirmMutation = useMutation({
    mutationFn: (row: MonthGridRow) =>
      autoCategory && row.autoCategoryHours > 0
        ? confirmDayInRepo(repository, row.date, row.autoCategoryHours, autoCategory)
        : repository.updateDay(row.date, (day) => ({ ...day, confirmed: true })),
    onSuccess: invalidate,
  })

  const gridUnconfirmMutation = useMutation({
    mutationFn: (date: string) =>
      repository.updateDay(date, (day) => ({ ...day, confirmed: false })),
    onSuccess: invalidate,
  })

  const dayTypeMutation = useMutation({
    mutationFn: ({ date, value }: { date: string; value: string }) =>
      saveDayTypeInRepo(repository, date, value),
    onSuccess: invalidate,
  })

  const locationMutation = useMutation({
    mutationFn: ({ date, location }: { date: string; location: WorkLocation | null }) =>
      repository.updateDay(date, (day) => {
        if (!location) {
          const updated = { ...day }
          delete updated.location
          return updated
        }
        return { ...day, location }
      }),
    onSuccess: invalidate,
  })

  const rows = buildMonthGrid({ year, month, monthData, dayTypes })

  function draftKey(date: string, category: string) {
    return `${date}::${category}`
  }

  function handleBlur(row: MonthGridRow, category: string) {
    const key = draftKey(row.date, category)
    const raw = drafts[key]
    if (raw === undefined) return

    const hours = parseFloat(raw)
    const dayEntries = monthData[row.date]?.entries ?? []
    const existing = dayEntries.find((e) => e.category === category)

    if (isNaN(hours) || hours === 0) {
      if (existing) deleteMutation.mutate({ date: row.date, entry: existing })
    } else {
      saveMutation.mutate({
        date: row.date,
        entry: { id: existing?.id ?? crypto.randomUUID(), category, hours },
        previous: existing ?? null,
      })
    }

    setDrafts((d) => {
      const next = { ...d }
      delete next[key]
      return next
    })
  }

  function clearCell(date: string, category: string) {
    const dayEntries = monthData[date]?.entries ?? []
    const existing = dayEntries.find((e) => e.category === category)
    if (existing) deleteMutation.mutate({ date, entry: existing })
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


  function cycleLocation(date: string) {
    const effective: WorkLocation = workLocations.get(date) ?? defaultWorkLocation ?? 'Remote'
    const next: WorkLocation = effective === 'Remote' ? 'Office' : 'Remote'
    locationMutation.mutate({ date, location: next })
  }

  function handleDotClick(e: React.MouseEvent<HTMLButtonElement>, row: MonthGridRow) {
    const rect = e.currentTarget.getBoundingClientRect()
    const currentDayType = row.dayType === 'Weekend' ? 'WorkDay' : (dayTypes.get(row.date) ?? 'WorkDay')
    const { displayStatus, reason } = classifyRow(row, autoCategory, confirmedDays, todayIso)
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
    const spliced = newOrder.splice(from, 1)
    const moved = spliced[0]
    if (moved === undefined) return
    newOrder.splice(idx, 0, moved)
    onCategoryReorder?.(newOrder)
    colDragIdx.current = null
    setColDragOverIdx(null)
  }

  function handleColDragEnd() {
    colDragIdx.current = null
    setColDragOverIdx(null)
  }

  const colDragHandlers: ColumnDragHandlers = {
    onDragStart: handleColDragStart,
    onDragOver: handleColDragOver,
    onDrop: handleColDrop,
    onDragEnd: handleColDragEnd,
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

  // day + status + worked + location + separator + categories + confirm + note
  const colCount = allCategories.length + 7

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
                <CategoryColumnHeader
                  key={cat}
                  cat={cat}
                  catIdx={catIdx}
                  autoCategory={autoCategory}
                  editingCat={editingCat}
                  editValue={editValue}
                  colDragOverIdx={colDragOverIdx}
                  categoryDescriptions={categoryDescriptions}
                  onCategoryReorder={onCategoryReorder}
                  onCategoryRename={onCategoryRename}
                  onAutoCategoryChange={onAutoCategoryChange}
                  dragHandlers={colDragHandlers}
                  allCategories={allCategories}
                  onEditValueChange={setEditValue}
                  onCommitRename={commitRename}
                  onSetEditingCat={setEditingCat}
                />
              ))}
              <th className="px-1 py-1.5 text-center w-10 border-b border-l border-gray-200 dark:border-gray-700">
                <span className="text-xs">✓</span>
              </th>
              <th className="px-1 py-1.5 text-center w-8 border-b border-l border-gray-200 dark:border-gray-700" title="Notes">
                <span className="text-xs">📝</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sprintGroups.map((group) => {
              const sprintWorked = group.rows.reduce((s, r) => s + r.workedHours, 0)
              const groupRows = group.rows.map((row) => {
                const isNonWorkDay = row.dayType !== 'WorkDay'
                const isToday = row.date === todayIso
                const displayStatus = classifyRow(row, autoCategory, confirmedDays, todayIso).displayStatus
                const bgPair = isToday ? TODAY_ROW_BG : STATUS_ROW_BG[displayStatus]
                const rowBg = bgPair[globalRowIdx % 2]
                const loc = resolveWorkLocation(workLocations, row.date, defaultWorkLocation)
                const locIcon = loc === 'Office' ? '🏢' : '🏠'
                const rowOpacityClass = isNonWorkDay ? 'opacity-50' : ''
                const dayLabel = new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)
                globalRowIdx++
                return (
                  <tr
                    key={row.date}
                    role="row"
                    aria-label={row.date}
                    className={`${rowBg} ${rowOpacityClass}`}
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
                      windows={monthData[row.date]?.windows ?? []}
                      repository={repository}
                      className={`sticky left-[4.25rem] z-10 ${rowBg}`}
                    />
                    <td className="px-0 py-0 w-10 text-center border-l border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => cycleLocation(row.date)}
                        className="w-full h-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700 py-1"
                        aria-label={`Location ${row.date}`}
                        title={loc}
                      >
                        {locIcon}
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
                    <ConfirmCell
                      date={row.date}
                      isNonWorkDay={isNonWorkDay}
                      isConfirmed={confirmedDays.has(row.date)}
                      onConfirm={() => gridConfirmMutation.mutate(row)}
                      onUnconfirm={() => gridUnconfirmMutation.mutate(row.date)}
                    />
                    <td className="w-8 text-center border-l border-gray-200 dark:border-gray-700">
                      {onNoteChange && (
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setNotePopover({ date: row.date, value: dayNotes.get(row.date) ?? '', top: rect.bottom + 6, left: rect.left - 220 })
                          }}
                          className="w-full py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={`Note for ${row.date}`}
                          title={dayNotes.get(row.date) ?? 'Add note'}
                        >
                          <span className={dayNotes.has(row.date) ? 'opacity-100' : 'opacity-20'}>📝</span>
                        </button>
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
              <td className="w-8 border-l border-gray-200 dark:border-gray-700"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <StatusLegend className="px-1" />

      <DotPopoverPanel
        state={dotPopover}
        popoverRef={popoverRef}
        onSelectDayType={handleDayTypeSelect}
      />
      <NotePopoverPanel
        state={notePopover}
        popoverRef={notePopoverRef}
        onChange={(value) => setNotePopover((s) => s ? { ...s, value } : null)}
        onSave={() => {
          if (!notePopover) return
          onNoteChange?.(notePopover.date, notePopover.value.trim())
          setNotePopover(null)
        }}
        onClose={() => setNotePopover(null)}
      />
    </div>
  )
}
