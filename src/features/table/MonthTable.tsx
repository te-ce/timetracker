import { useState, useRef, Fragment, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCloseOnOutsideClickOrEscape } from '../../shared/useCloseOnOutsideClickOrEscape'
import type { MonthRepository, WorkLocation } from '../../infra/repositories/types'
import type { DotPopoverState } from '../day/DotPopoverPanel'
import type { NotePopoverState } from '../day/NotePopoverPanel'
import { DotPopoverPanel } from '../day/DotPopoverPanel'
import { NotePopoverPanel } from '../day/NotePopoverPanel'
import { DayTimeline } from '../day/DayTimeline'
import { classifyDay } from '../../shared/dayStatus'
import { getAllCategories } from '../../shared/categories'
import { computeSprintGroups } from '../sprint/sprintGroups'
import { WorkedHoursCell } from './WorkedHoursCell'
import { CategoryColumnHeader, type ColumnDragHandlers } from './CategoryColumnHeader'
import { categoryBreakdownWithAuto, categoryHoursIncludingAuto, type MonthTableRow } from './buildMonthTable'
import type { MonthView } from '../../shared/useMonthView'
import { STATUS_DOT } from '../../shared/statusColors'
import { targetHoursForDate } from '../../shared/weekdayHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'
import { Tooltip } from '../../shared/Tooltip'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import { DaySummaryBody } from '../../shared/DaySummaryBody'
import { resolveAutoCategory } from '../../shared/autoCategory'
import { useMonthGridMutations } from './useMonthGridMutations'
import { useDragReorder } from '../../shared/reorder'
import { dayDelta } from './dayDelta'
import { balanceBarStyle, balanceScale } from './barStyles'

const STICKY_BG = 'bg-white dark:bg-gray-900'

function isMonday(isoDate: string): boolean {
  return new Date(isoDate + 'T12:00').getDay() === 1
}

function overtimeTextClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

function classifyRow(row: MonthTableRow, today: string) {
  const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
  return classifyDay({
    dayType: row.dayType,
    workedHours: row.workedHours,
    manualTotal,
    isoDate: row.date,
    today,
  })
}

interface Props {
  view: MonthView
  repository: MonthRepository
  showOfficeStats?: boolean | undefined
  initialLogDate?: string | undefined
  onCategoryReorder?: ((order: string[]) => void) | undefined
  onCategoryRename?: ((oldName: string, newName: string) => void) | undefined
  onAutoCategoryChange?: ((category: string) => void) | undefined
  onNoteChange?: ((date: string, note: string) => void) | undefined
  onSelectDate?: ((isoDate: string) => void) | undefined
  onClearDay?: ((date: string) => void) | undefined
}

function resolveSprintStart(sprintStartDate: string | null, year: number): string {
  return sprintStartDate ?? `${year}-01-01`
}

function ClearColumnHeader({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <th
      className="px-1 py-1 text-center w-8 border-b border-l border-gray-200 dark:border-gray-700"
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
        type="button"
        onClick={() => onClearDay(date)}
        className="w-full py-[3px] text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded"
        aria-label={`Clear ${date}`}
        data-tooltip="Clear all data for this day"
      >
        ×
      </button>
    </td>
  )
}

export function MonthGrid({
  view,
  repository,
  showOfficeStats = true,
  initialLogDate,
  onCategoryReorder,
  onCategoryRename,
  onAutoCategoryChange,
  onNoteChange,
  onSelectDate,
  onClearDay,
}: Props) {
  const { year, month, monthData, rows, todayIso, config } = view
  const {
    autoCategory,
    customCategories,
    categoryOrder,
    categoryDescriptions,
    sprintStartDate,
    sprintLengthDays,
    defaultWorkLocation,
  } = config
  const dayTypes = view.dayTypeOverrides
  const { workLocations, dayNotes } = view
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [dotPopover, setDotPopover] = useState<DotPopoverState | null>(null)
  const [notePopover, setNotePopover] = useState<NotePopoverState | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const notePopoverRef = useRef<HTMLDivElement>(null)
  const allCategories = getAllCategories(customCategories, categoryOrder)
  const {
    dragOverIdx: colDragOverIdx,
    handleDragStart: handleColDragStart,
    handleDragOver: handleColDragOver,
    handleDrop: handleColDrop,
    handleDragEnd: handleColDragEnd,
  } = useDragReorder(allCategories, (newOrder) => onCategoryReorder?.(newOrder))
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [activeDialogDate, setActiveDialogDate] = useState<string | null>(initialLogDate ?? null)
  const [activeDialogCategory, setActiveDialogCategory] = useState<string | null>(null)
  const categoryDialogRef = useRef<HTMLDivElement>(null)

  function closeDialog() {
    setActiveDialogDate(null)
    setActiveDialogCategory(null)
  }

  useEffect(() => {
    if (!activeDialogDate) return
    function handleMouseDown(e: MouseEvent) {
      if (categoryDialogRef.current && e.target instanceof Node && !categoryDialogRef.current.contains(e.target)) {
        closeDialog()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDialog()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [activeDialogDate])

  const renderDayCell = useCallback(
    (date: string, dayLabel: string, isToday: boolean) => {
      const boldClass = isToday ? 'font-bold' : ''
      if (onSelectDate) {
        return (
          <td
            className={`sticky left-0 z-10 ${STICKY_BG} px-1.5 py-[3px] font-mono text-[11px] ${boldClass} cursor-pointer text-indigo-600 dark:text-indigo-400 hover:underline`}
            onClick={() => onSelectDate(date)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectDate(date)
              }
            }}
            tabIndex={0}
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
        <td className={`sticky left-0 z-10 ${STICKY_BG} px-1.5 py-[3px] font-mono text-[11px] ${boldClass}`}>
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

  const { dayType: dayTypeMutation, location: locationMutation } = useMonthGridMutations({
    repository,
    year,
    month,
    monthData,
  })

  function getCellValue(row: MonthTableRow, category: string): string {
    const val = categoryHoursIncludingAuto(row, category)
    return val ? formatHoursCompact(val, timeFormat) : ''
  }

  function cycleLocation(date: string) {
    const effective: WorkLocation = workLocations.get(date) ?? defaultWorkLocation
    const next: WorkLocation = effective === 'Remote' ? 'Office' : 'Remote'
    locationMutation.mutate({ date, location: next })
  }

  function handleDotClick(e: React.SyntheticEvent<HTMLElement>, row: MonthTableRow) {
    const rect = e.currentTarget.getBoundingClientRect()
    const currentDayType = dayTypes.get(row.date) ?? row.dayType
    const { displayStatus, reason, leaveType } = classifyRow(row, todayIso)
    const categoryBreakdown = categoryBreakdownWithAuto(row)
    setDotPopover({
      date: row.date,
      currentDayType,
      top: rect.bottom + 6,
      left: rect.left,
      displayStatus,
      reason,
      workedHours: row.workedHours,
      categoryBreakdown,
      categoryDescriptions,
      ...(leaveType !== undefined ? { leaveType } : {}),
    })
  }

  function handleDayTypeSelect(value: string) {
    if (!dotPopover) return
    dayTypeMutation.mutate({ date: dotPopover.date, value })
    setDotPopover(null)
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

  const totalWorked = rows.reduce((sum, row) => sum + row.workedHours, 0)
  const sprintGroups = computeSprintGroups(rows, resolveSprintStart(sprintStartDate, year), sprintLengthDays)
  const balScale = balanceScale(rows.map((row) => row.accumulatedOvertime))

  // day + status + worked + day ± + balance + categories + location + note + (clear?)
  const colCount = allCategories.length + 7 + Number(!!onClearDay)

  return (
    <div className="flex flex-col gap-2">
      <div data-testid="table-scroll-container" className="overflow-x-auto relative">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm">
            <tr className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="sticky left-0 z-30 bg-white dark:bg-gray-800 px-1.5 py-1 text-left w-[3.6rem] border-b dark:border-gray-700">
                Day
              </th>
              <th
                className="sticky left-[3.6rem] z-30 bg-white dark:bg-gray-800 px-1 py-1 w-5 border-b dark:border-gray-700"
                data-tooltip="Day status — click to change day type"
              >
                <span className="sr-only">Status</span>
              </th>
              <th className="sticky left-[4.6rem] z-30 bg-white dark:bg-gray-800 px-1.5 py-1 text-right w-14 border-b dark:border-gray-700">
                Worked
              </th>
              <th
                className="px-1.5 py-1 text-right w-12 border-b border-gray-200 dark:border-gray-700"
                data-tooltip="Worked minus target for this day"
              >
                Day ±
              </th>
              <th
                className="px-1.5 py-1 text-right w-16 border-b border-r border-gray-200 dark:border-gray-700"
                data-tooltip="Accumulated over/undertime up to this date"
              >
                Balance
              </th>
              {allCategories.map((cat, catIdx) => (
                <CategoryColumnHeader
                  key={cat}
                  cat={cat}
                  catIdx={catIdx}
                  allCategories={allCategories}
                  autoCategory={autoCategory ?? ''}
                  editingCat={editingCat}
                  editValue={editValue}
                  colDragOverIdx={colDragOverIdx}
                  categoryDescriptions={categoryDescriptions}
                  onCategoryReorder={onCategoryReorder}
                  onCategoryRename={onCategoryRename}
                  onAutoCategoryChange={onAutoCategoryChange}
                  dragHandlers={colDragHandlers}
                  onEditValueChange={setEditValue}
                  onCommitRename={commitRename}
                  onSetEditingCat={setEditingCat}
                />
              ))}
              {showOfficeStats && (
                <th
                  className="px-1 py-1 text-center w-6 border-b border-l border-gray-200 dark:border-gray-700"
                  data-tooltip="Work location — click to toggle Office / Remote"
                >
                  <span aria-hidden="true">📍</span>
                  <span className="sr-only">Location</span>
                </th>
              )}
              <th
                className="px-1.5 py-1 text-left min-w-[6rem] border-b border-gray-200 dark:border-gray-700"
                data-tooltip="Day notes"
              >
                Note
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
                const { displayStatus, reason, leaveType } = classifyRow(row, todayIso)
                const dim = isNonWorkDay && row.workedHours === 0 && Object.keys(row.entries).length === 0
                const loc = workLocations.get(row.date) ?? defaultWorkLocation
                const locIcon = loc === 'Office' ? '🏢' : '🏠'
                const dayLabel = new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' })
                const rowDelta = dayDelta(
                  row.workedHours,
                  targetHoursForDate(row.date, config.weekdayHours),
                  row.accumulatedOvertime,
                )
                const rowCategoryBreakdown = categoryBreakdownWithAuto(row)
                const daySummaryData: DaySummaryData = {
                  displayStatus,
                  reason,
                  workedHours: row.workedHours,
                  categoryBreakdown: rowCategoryBreakdown,
                  categoryDescriptions,
                  ...(leaveType !== undefined ? { leaveType } : {}),
                }
                const note = dayNotes.get(row.date)
                const weekStartClass = isMonday(row.date) ? 'border-t-2 border-t-gray-300 dark:border-t-gray-600' : ''
                return (
                  <tr
                    key={row.date}
                    aria-label={row.date}
                    className={`border-b border-gray-100 dark:border-gray-800 ${weekStartClass} ${isToday ? 'bg-amber-50 dark:bg-amber-900/20' : ''} ${dim ? 'opacity-50' : ''}`}
                  >
                    {renderDayCell(row.date, dayLabel, isToday)}
                    <td
                      className={`sticky left-[3.6rem] z-10 ${STICKY_BG} px-1 py-[3px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                      onClick={(e) => handleDotClick(e, row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleDotClick(e, row)
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Day status: ${displayStatus}. Click to change day type.`}
                    >
                      <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[displayStatus]}`} />
                    </td>
                    <WorkedHoursCell
                      date={row.date}
                      workedHours={parseFloat(row.workedHours.toFixed(2))}
                      windows={monthData[row.date]?.windows ?? []}
                      repository={repository}
                      autoCategory={row.resolvedAutoCategory}
                      customCategories={customCategories}
                      categoryOrder={categoryOrder}
                      categoryDescriptions={categoryDescriptions}
                      daySummaryData={daySummaryData}
                      targetHours={targetHoursForDate(row.date, config.weekdayHours)}
                      className={`sticky left-[4.6rem] z-10 ${STICKY_BG}${isToday ? ' ring-2 ring-inset ring-amber-500 dark:ring-amber-400 font-semibold' : ''}`}
                    />
                    <td className="px-1.5 py-[3px] w-12 text-right text-[11px] tabular-nums">
                      {rowDelta !== null && (
                        <span className={overtimeTextClass(rowDelta)}>
                          {rowDelta > 0 ? '+' : ''}
                          {formatHoursCompact(rowDelta, timeFormat)}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-1.5 py-[3px] w-16 border-r border-gray-200 text-right text-[11px] font-semibold tabular-nums dark:border-gray-700"
                      style={row.accumulatedOvertime !== null ? balanceBarStyle(row.accumulatedOvertime, balScale) : {}}
                    >
                      <Tooltip content={<DaySummaryBody {...daySummaryData} timeFormat={timeFormat} dark />}>
                        <span className="block w-full text-right">
                          {/* Every past day carries the balance, not only the tracked ones — the
                              question this column answers is "where do I stand as of this date". */}
                          {row.accumulatedOvertime !== null && (
                            <span className={overtimeTextClass(row.accumulatedOvertime)}>
                              {row.accumulatedOvertime > 0 ? '+' : ''}
                              {formatHoursCompact(row.accumulatedOvertime, timeFormat)}
                            </span>
                          )}
                        </span>
                      </Tooltip>
                    </td>
                    {allCategories.map((cat, catIdx) => {
                      const isAutoTarget = cat === row.resolvedAutoCategory
                      const val = getCellValue(row, cat)
                      const catBorderClass =
                        catIdx > 0 ? 'border-l border-dashed border-gray-300 dark:border-gray-600' : ''
                      return (
                        <td
                          key={cat}
                          className={`px-1 py-[3px] w-14 min-w-[3.5rem] max-w-[3.5rem] cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 ${catBorderClass} ${isAutoTarget && row.autoCategoryHours > 0 ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
                          onClick={() => {
                            setActiveDialogDate(row.date)
                            setActiveDialogCategory(cat)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setActiveDialogDate(row.date)
                              setActiveDialogCategory(cat)
                            }
                          }}
                          tabIndex={0}
                        >
                          <span className="inline-block w-full rounded text-right text-[11px] tabular-nums text-gray-700 dark:text-gray-200">
                            {val}
                          </span>
                        </td>
                      )
                    })}
                    {showOfficeStats && (
                      <td
                        className="w-6 border-l border-gray-200 px-1 py-0 text-center text-[10px] dark:border-gray-700"
                        title={loc}
                      >
                        <button
                          type="button"
                          onClick={() => cycleLocation(row.date)}
                          className="w-full py-[3px] hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={`Location ${row.date}`}
                        >
                          {locIcon}
                        </button>
                      </td>
                    )}
                    <td className="min-w-[6rem] px-1.5 py-[3px] text-[10px] text-gray-500 dark:text-gray-400">
                      {onNoteChange ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setNotePopover({
                              date: row.date,
                              value: note ?? '',
                              top: rect.bottom + 6,
                              left: rect.left - 220,
                            })
                          }}
                          className="block w-full truncate text-left hover:underline"
                          aria-label={`Note for ${row.date}`}
                          data-tooltip={note ?? 'Add note'}
                        >
                          {note || ' '}
                        </button>
                      ) : (
                        <span className="block truncate" title={note ?? ''}>
                          {note}
                        </span>
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
                        className="px-1.5 py-[3px] text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border-b dark:border-gray-700"
                      >
                        {group.label}
                      </td>
                    </tr>
                  )}
                  {groupRows}
                  {group.label && (
                    <tr className="bg-indigo-50/40 dark:bg-indigo-900/20 border-t dark:border-gray-700">
                      <td
                        colSpan={2}
                        className="sticky left-0 z-10 bg-indigo-50/40 dark:bg-indigo-900/20 px-1.5 py-[2px] text-[11px] font-medium whitespace-nowrap"
                      >
                        {group.label} Total
                      </td>
                      <td
                        className="sticky left-[4.6rem] z-10 bg-indigo-50/40 dark:bg-indigo-900/20 px-1.5 py-[2px] text-right text-[11px] font-medium"
                        data-testid={`sprint-worked-${group.label}`}
                      >
                        {formatHoursCompact(sprintWorked, timeFormat)}
                      </td>
                      <td></td>
                      <td></td>
                      {allCategories.map((cat, catIdx) => {
                        const catTotal = group.rows.reduce((sum, row) => sum + categoryHoursIncludingAuto(row, cat), 0)
                        const catBorderClass =
                          catIdx > 0 ? 'border-l border-dashed border-gray-300 dark:border-gray-600' : ''
                        return (
                          <td
                            key={cat}
                            className={`px-1 py-[2px] text-right text-[11px] w-14 min-w-[3.5rem] max-w-[3.5rem] font-medium ${catBorderClass}`}
                          >
                            {catTotal > 0 ? formatHoursCompact(catTotal, timeFormat) : ''}
                          </td>
                        )
                      })}
                      {showOfficeStats && <td></td>}
                      <td></td>
                      <ClearColumnPlaceholder visible={!!onClearDay} />
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-white dark:bg-gray-800 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <tr className="border-t dark:border-gray-700 font-semibold text-[11px]">
              <td className="sticky left-0 z-30 bg-white dark:bg-gray-800 px-1.5 py-1">Total</td>
              <td className="sticky left-[3.6rem] z-30 bg-white dark:bg-gray-800"></td>
              <td
                className="sticky left-[4.6rem] z-30 bg-white dark:bg-gray-800 px-1.5 py-1 text-right"
                data-testid="total-worked"
              >
                {formatHoursCompact(totalWorked, timeFormat)}
              </td>
              <td className="w-12"></td>
              <td className="w-16 border-r border-gray-200 dark:border-gray-700"></td>
              {allCategories.map((cat, catIdx) => {
                const catTotal = rows.reduce((sum, row) => sum + categoryHoursIncludingAuto(row, cat), 0)
                const catBorderClass = catIdx > 0 ? 'border-l border-dashed border-gray-300 dark:border-gray-600' : ''
                return (
                  <td
                    key={cat}
                    className={`px-1 py-1 text-right text-[11px] w-14 min-w-[3.5rem] max-w-[3.5rem] ${catBorderClass}`}
                  >
                    {catTotal > 0 ? formatHoursCompact(catTotal, timeFormat) : ''}
                  </td>
                )
              })}
              {showOfficeStats && <td className="w-6 border-l border-gray-200 dark:border-gray-700"></td>}
              <td></td>
              <ClearColumnPlaceholder visible={!!onClearDay} />
            </tr>
          </tfoot>
        </table>
      </div>

      {activeDialogDate &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100] bg-black/20" />
            <div
              ref={categoryDialogRef}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-2xl rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl"
            >
              <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                    Work periods
                  </p>
                  <p className="text-sm font-semibold">
                    {new Date(activeDialogDate + 'T12:00').toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeDialog()}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none p-1 rounded"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
                <DayTimeline
                  showTotals={false}
                  date={activeDialogDate}
                  windows={monthData[activeDialogDate]?.windows ?? []}
                  repository={repository}
                  autoCategory={resolveAutoCategory(monthData[activeDialogDate]?.autoCategoryOverride, autoCategory)}
                  customCategories={customCategories}
                  categoryOrder={categoryOrder}
                  categoryDescriptions={categoryDescriptions}
                  initialCategory={activeDialogCategory ?? undefined}
                />
              </div>
            </div>
          </>,
          document.body,
        )}
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
