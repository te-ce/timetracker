import { useState, useRef, Fragment, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCloseOnOutsideClickOrEscape } from '../../shared/useCloseOnOutsideClickOrEscape'
import type { MonthRepository, WorkLocation } from '../../infra/repositories/types'
import type { DotPopoverState } from '../day/DotPopoverPanel'
import type { NotePopoverState } from '../day/NotePopoverPanel'
import { DotPopoverPanel } from '../day/DotPopoverPanel'
import { NotePopoverPanel } from '../day/NotePopoverPanel'
import { DayTimeline } from '../day/DayTimeline'
import { getAllCategories } from '../../shared/categories'
import { computeSprintGroups } from '../sprint/sprintGroups'
import { CategoryColumnHeader, type ColumnDragHandlers } from './CategoryColumnHeader'
import { categoryBreakdownWithAuto, categoryHoursIncludingAuto, type MonthTableRow } from './buildMonthTable'
import type { MonthView } from '../../shared/useMonthView'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHoursCompact } from '../../shared/formatHours'
import { Tooltip } from '../../shared/Tooltip'
import { resolveAutoCategory } from '../../shared/autoCategory'
import { useMonthGridMutations } from './useMonthGridMutations'
import { useDragReorder } from '../../shared/reorder'
import { balanceScale } from './barStyles'
import { ClearColumnHeader } from './cells/ClearColumnHeader'
import { ClearColumnPlaceholder } from './cells/ClearColumnPlaceholder'
import { MonthTableDataRow } from './cells/MonthTableDataRow'
import { classifyRow, STICKY_BG } from './monthTableRow'

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
    preferCategoryDescriptionAsPrimary,
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
      preferCategoryDescriptionAsPrimary,
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
                  preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
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
              const groupRows = group.rows.map((row) => (
                <MonthTableDataRow
                  key={row.date}
                  row={row}
                  todayIso={todayIso}
                  monthData={monthData}
                  repository={repository}
                  customCategories={customCategories}
                  categoryOrder={categoryOrder}
                  categoryDescriptions={categoryDescriptions}
                  preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
                  allCategories={allCategories}
                  workLocations={workLocations}
                  defaultWorkLocation={defaultWorkLocation}
                  dayNotes={dayNotes}
                  timeFormat={timeFormat}
                  balScale={balScale}
                  showOfficeStats={showOfficeStats}
                  onNoteChange={onNoteChange}
                  onClearDay={onClearDay}
                  renderDayCell={renderDayCell}
                  getCellValue={getCellValue}
                  onDotClick={handleDotClick}
                  onCycleLocation={cycleLocation}
                  onOpenCategoryDialog={(date, category) => {
                    setActiveDialogDate(date)
                    setActiveDialogCategory(category)
                  }}
                  onOpenNotePopover={setNotePopover}
                />
              ))

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
                  preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
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
