import { useState, useRef, Fragment, useCallback } from 'react'
import { useCloseOnOutsideClickOrEscape } from '../../shared/useCloseOnOutsideClickOrEscape'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, WorkLocation } from '../../infra/repositories/types'
import type { DayType, DotPopoverState, NotePopoverState } from '../day'
import { isDayTypeOverride, DotPopoverPanel, NotePopoverPanel } from '../day'
import { classifyDay } from '../../shared/dayStatus'
import { buildMonthTable } from './buildMonthTable'
import { getAllCategories } from '../../shared/categories'
import { computeSprintGroups } from '../sprint'
import { WorkedHoursCell } from './WorkedHoursCell'
import { CategoryColumnHeader, type ColumnDragHandlers } from './CategoryColumnHeader'
import { QUERY_KEYS, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { toLocalIso } from '../../shared/dateUtils'
import type { MonthTableRow } from './buildMonthTable'
import { STATUS_DOT, STATUS_ROW_BG } from '../../shared/statusColors'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'
import { Tooltip } from '../../shared'

const TODAY_ROW_BG: [string, string] = ['bg-amber-200 dark:bg-amber-800', 'bg-amber-300/70 dark:bg-amber-900/70']

async function confirmDayInRepo(repository: MonthRepository, date: string): Promise<void> {
  await repository.updateDay(date, (day) => ({ ...day, confirmed: true }))
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

function classifyRow(row: MonthTableRow, autoCategory: string | null, confirmedDays: Set<string>, today: string) {
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
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  dayTypes?: Map<string, DayType> | undefined
  confirmedDays?: Set<string> | undefined
  sprintStartDate?: string | null | undefined
  sprintLengthDays?: number | undefined
  workLocations?: Map<string, WorkLocation> | undefined
  defaultWorkLocation?: WorkLocation | null | undefined
  categoryDescriptions?: Record<string, string> | undefined
  dayNotes?: Map<string, string> | undefined
  onCategoryReorder?: ((order: string[]) => void) | undefined
  onCategoryRename?: ((oldName: string, newName: string) => void) | undefined
  onAutoCategoryChange?: ((category: string) => void) | undefined
  onNoteChange?: ((date: string, note: string) => void) | undefined
  onSelectDate?: ((isoDate: string) => void) | undefined
  onClearDay?: ((date: string) => void) | undefined
  expanded?: boolean | undefined
}

function resolveSprintStart(sprintStartDate: string | null, year: number): string {
  return sprintStartDate ?? `${year}-01-01`
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
        if (isConfirmed) {
          onUnconfirm()
        } else {
          onConfirm()
        }
      }}
      aria-label={confirmLabel}
      data-tooltip={confirmTitle}
    >
      {!isNonWorkDay && (
        <span
          className={`text-xs font-bold ${isConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}
        >
          {isConfirmed ? '✓' : '○'}
        </span>
      )}
    </td>
  )
}

function ClearColumnHeader({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <th
      className="px-1 py-1.5 text-center w-8 border-b border-l border-gray-200 dark:border-gray-700"
      data-tooltip="Clear all data for this day"
    >
      <span className="sr-only">Clear day</span>
    </th>
  )
}

function ClearColumnPlaceholder({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <td className="w-8 border-l border-gray-200 dark:border-gray-700"></td>
}

function ClearCell({ date, onClearDay }: { date: string; onClearDay?: ((date: string) => void) | undefined }) {
  if (!onClearDay) return null
  return (
    <td className="w-8 text-center border-l border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onClearDay(date)}
        className="w-full py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        aria-label={`Clear ${date}`}
        data-tooltip="Clear all data for this day"
      >
        ×
      </button>
    </td>
  )
}

function outerContainerClass(expanded: boolean | undefined): string {
  if (expanded) return 'flex flex-col h-full'
  return 'flex flex-col gap-2'
}

function scrollContainerClass(expanded: boolean | undefined): string {
  if (expanded) return 'overflow-x-auto flex-1 min-h-0 overflow-y-auto relative'
  return 'overflow-x-auto max-h-[75vh] overflow-y-auto relative'
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
  onClearDay,
  expanded,
}: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [dotPopover, setDotPopover] = useState<DotPopoverState | null>(null)
  const [notePopover, setNotePopover] = useState<NotePopoverState | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const notePopoverRef = useRef<HTMLDivElement>(null)
  const colDragIdx = useRef<number | null>(null)
  const [colDragOverIdx, setColDragOverIdx] = useState<number | null>(null)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const todayIso = toLocalIso(new Date())

  const renderDayCell = useCallback(
    (date: string, dayLabel: string, rowBg: string) => {
      if (onSelectDate) {
        return (
          <td
            className={`sticky left-0 z-10 px-2 py-1 font-mono text-xs cursor-pointer text-indigo-600 dark:text-indigo-400 hover:underline ${rowBg}`}
            onClick={() => onSelectDate(date)}
          >
            <Tooltip content={`Open ${date}`}>
              <span data-testid="day-link" className="inline-flex items-center">
                {date.slice(8)}
                <span className="text-gray-400 dark:text-gray-500 ml-0.5">{dayLabel}</span>
              </span>
            </Tooltip>
          </td>
        )
      }
      return (
        <td className={`sticky left-0 z-10 px-2 py-1 font-mono text-xs ${rowBg}`}>
          <Tooltip content={date}>
            <span data-testid="day-link" className="inline-flex items-center">
              {date.slice(8)}
              <span className="text-gray-400 dark:text-gray-500 ml-0.5">{dayLabel}</span>
            </span>
          </Tooltip>
        </td>
      )
    },
    [onSelectDate],
  )

  const closeDotPopover = useCallback(() => setDotPopover(null), [])
  const closeNotePopover = useCallback(() => setNotePopover(null), [])
  useCloseOnOutsideClickOrEscape(!!dotPopover, popoverRef, closeDotPopover, { escapeKey: true })
  useCloseOnOutsideClickOrEscape(!!notePopover, notePopoverRef, closeNotePopover)

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => repository.getMonth(year, month),
  })

  const queryClient = useQueryClient()

  function invalidate() {
    invalidateMonthByYearMonth(queryClient, year, month)
  }

  const gridConfirmMutation = useMutation({
    mutationFn: (row: MonthTableRow) => confirmDayInRepo(repository, row.date),
    onSuccess: invalidate,
  })

  const gridUnconfirmMutation = useMutation({
    mutationFn: (date: string) => repository.updateDay(date, (day) => ({ ...day, confirmed: false })),
    onSuccess: invalidate,
  })

  const dayTypeMutation = useMutation({
    mutationFn: ({ date, value }: { date: string; value: string }) => saveDayTypeInRepo(repository, date, value),
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

  const rows = buildMonthTable({ year, month, monthData, dayTypes })

  function getCellValue(row: MonthTableRow, category: string): string {
    const manual = row.entries[category] ?? 0
    const autoHours = category === autoCategory ? row.autoCategoryHours : 0
    const val = manual + autoHours
    return val ? formatHoursCompact(val, timeFormat) : ''
  }

  function cycleLocation(date: string) {
    const effective: WorkLocation = workLocations.get(date) ?? defaultWorkLocation ?? 'Remote'
    const next: WorkLocation = effective === 'Remote' ? 'Office' : 'Remote'
    locationMutation.mutate({ date, location: next })
  }

  function handleDotClick(e: React.MouseEvent<HTMLElement>, row: MonthTableRow) {
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
  const sprintGroups = computeSprintGroups(rows, resolveSprintStart(sprintStartDate, year), sprintLengthDays)

  // day + status + worked + location + separator + categories + confirm + note + (clear?)
  const colCount = allCategories.length + 7 + Number(!!onClearDay)

  let globalRowIdx = 0

  return (
    <div className={outerContainerClass(expanded)}>
      <div data-testid="table-scroll-container" className={scrollContainerClass(expanded)}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 bg-white dark:bg-gray-800 px-2 py-1.5 text-left w-12 border-b dark:border-gray-700">
                Day
              </th>
              <th
                className="sticky left-12 z-30 bg-white dark:bg-gray-800 px-1 py-1.5 w-5 border-b dark:border-gray-700"
                data-tooltip="Day status — click to change day type"
              >
                <span className="sr-only">Status</span>
              </th>
              <th className="sticky left-[4.25rem] z-30 bg-white dark:bg-gray-800 px-2 py-1.5 text-center w-16 border-b dark:border-gray-700">
                Worked
              </th>
              <th
                className="px-1 py-1.5 text-center w-10 border-b dark:border-gray-700 text-xs border-l border-gray-200 dark:border-l-gray-700"
                data-tooltip="Work location — click to toggle Office / Remote"
              >
                <span aria-hidden="true">📍</span>
                <span className="sr-only">Location</span>
              </th>
              <th className="w-px border-l border-b border-gray-300 dark:border-gray-600"></th>
              {allCategories.map((cat, catIdx) => (
                <CategoryColumnHeader
                  key={cat}
                  cat={cat}
                  catIdx={catIdx}
                  autoCategory={autoCategory ?? ''}
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
              <th
                className="px-1 py-1.5 text-center w-10 border-b border-l border-gray-200 dark:border-gray-700"
                data-tooltip="Confirmed — click to confirm or unconfirm"
              >
                <span className="text-xs" aria-hidden="true">
                  ✓
                </span>
                <span className="sr-only">Confirmed</span>
              </th>
              <th
                className="px-1 py-1.5 text-center w-8 border-b border-l border-gray-200 dark:border-gray-700"
                data-tooltip="Day notes"
              >
                <span aria-hidden="true" className="text-xs">
                  📝
                </span>
                <span className="sr-only">Notes</span>
              </th>
              <ClearColumnHeader visible={!!onClearDay} />
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
                const rowBg = bgPair[globalRowIdx % 2]!
                const loc = resolveWorkLocation(workLocations, row.date, defaultWorkLocation)
                const locIcon = loc === 'Office' ? '🏢' : '🏠'
                const rowOpacityClass = isNonWorkDay ? 'opacity-50' : ''
                const dayLabel = new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)
                globalRowIdx++
                return (
                  <tr key={row.date} aria-label={row.date} className={`${rowBg} ${rowOpacityClass}`}>
                    {renderDayCell(row.date, dayLabel, rowBg)}
                    <td
                      className={`sticky left-12 z-10 px-1 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${rowBg}`}
                      onClick={(e) => handleDotClick(e, row)}
                      aria-label={`Day status: ${displayStatus}. Click to change day type.`}
                    >
                      <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[displayStatus]}`} />
                    </td>
                    <WorkedHoursCell
                      date={row.date}
                      workedHours={parseFloat(row.workedHours.toFixed(2))}
                      windows={monthData[row.date]?.windows ?? []}
                      repository={repository}
                      autoCategory={autoCategory}
                      customCategories={customCategories}
                      categoryOrder={categoryOrder}
                      categoryDescriptions={categoryDescriptions}
                      className={`sticky left-[4.25rem] z-10 ${rowBg}${isToday ? ' ring-2 ring-inset ring-amber-500 dark:ring-amber-400 font-semibold' : ''}`}
                    />
                    <td className="px-0 py-0 w-10 text-center border-l border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => cycleLocation(row.date)}
                        className="w-full h-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700 py-1"
                        aria-label={`Location ${row.date}`}
                        data-tooltip={loc}
                      >
                        {locIcon}
                      </button>
                    </td>
                    <td className="w-px border-l border-gray-200 dark:border-gray-700"></td>
                    {allCategories.map((cat) => {
                      const isAutoTarget = cat === autoCategory
                      const val = getCellValue(row, cat)
                      return (
                        <td key={cat} className="px-0.5 py-0.5 w-16 min-w-[4rem] max-w-[4rem]">
                          <span
                            className={`inline-block w-full rounded px-1 py-0.5 text-right text-xs text-gray-600 dark:text-gray-300 ${isAutoTarget && row.autoCategoryHours > 0 ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
                            data-tooltip="Edit hours in Day view"
                          >
                            {val}
                          </span>
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
                            setNotePopover({
                              date: row.date,
                              value: dayNotes.get(row.date) ?? '',
                              top: rect.bottom + 6,
                              left: rect.left - 220,
                            })
                          }}
                          className="w-full py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={`Note for ${row.date}`}
                          data-tooltip={dayNotes.get(row.date) ?? 'Add note'}
                        >
                          <span className={dayNotes.has(row.date) ? 'opacity-100' : 'opacity-20'}>📝</span>
                        </button>
                      )}
                    </td>
                    <ClearCell date={row.date} onClearDay={onClearDay} />
                  </tr>
                )
              })

              return (
                <Fragment key={group.label}>
                  {group.label && (
                    <tr className="bg-indigo-50/60 dark:bg-indigo-900/20">
                      <td
                        colSpan={colCount}
                        className="px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border-b dark:border-gray-700"
                      >
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
                      <td
                        className="sticky left-[4.25rem] z-10 bg-indigo-50/40 dark:bg-indigo-900/20 px-2 py-0.5 text-right text-xs font-medium"
                        data-testid={`sprint-worked-${group.label}`}
                      >
                        {formatHoursCompact(sprintWorked, timeFormat)}
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
                            {catTotal > 0 ? formatHoursCompact(catTotal, timeFormat) : ''}
                          </td>
                        )
                      })}
                      <td></td>
                      <td></td>
                      <ClearColumnPlaceholder visible={!!onClearDay} />
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
              <td
                className="sticky left-[4.25rem] z-30 bg-white dark:bg-gray-800 px-2 py-1 text-right"
                data-testid="total-worked"
              >
                {formatHoursCompact(totalWorked, timeFormat)}
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
                    {catTotal > 0 ? formatHoursCompact(catTotal, timeFormat) : ''}
                  </td>
                )
              })}
              <td className="w-10 border-l border-gray-200 dark:border-gray-700"></td>
              <td className="w-8 border-l border-gray-200 dark:border-gray-700"></td>
              <ClearColumnPlaceholder visible={!!onClearDay} />
            </tr>
          </tfoot>
        </table>
      </div>

      <DotPopoverPanel state={dotPopover} popoverRef={popoverRef} onSelectDayType={handleDayTypeSelect} />
      <NotePopoverPanel
        state={notePopover}
        popoverRef={notePopoverRef}
        onChange={(value) => setNotePopover((s) => (s ? { ...s, value } : null))}
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
