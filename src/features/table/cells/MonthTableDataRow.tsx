import type React from 'react'
import type { MonthData, MonthRepository, WorkLocation } from '../../../infra/repositories/types'
import { STATUS_DOT } from '../../../shared/statusColors'
import type { TimeFormat } from '../../../shared/timeFormatStore'
import type { NotePopoverState } from '../../day/NotePopoverPanel'
import type { balanceScale } from '../barStyles'
import type { MonthTableRow } from '../buildMonthTable'
import { dayDelta } from '../dayDelta'
import {
  buildDaySummaryData,
  classifyRow,
  isDimRow,
  rowClassName,
  STICKY_BG,
  workedHoursCellClassName,
} from '../monthTableRow'
import { WorkedHoursCell } from '../WorkedHoursCell'
import { BalanceCell } from './BalanceCell'
import { ClearCell } from './ClearCell'
import { DeltaCell } from './DeltaCell'
import { LocationCell } from './LocationCell'
import { NoteCell } from './NoteCell'

export interface MonthTableDataRowProps {
  row: MonthTableRow
  todayIso: string
  monthData: MonthData
  repository: MonthRepository
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  allCategories: string[]
  workLocations: Map<string, WorkLocation>
  defaultWorkLocation: WorkLocation
  dayNotes: Map<string, string>
  timeFormat: TimeFormat
  balScale: ReturnType<typeof balanceScale>
  showOfficeStats: boolean
  onNoteChange?: ((date: string, note: string) => void) | undefined
  onClearDay?: ((date: string) => void) | undefined
  renderDayCell: (date: string, dayLabel: string, isToday: boolean) => React.ReactNode
  getCellValue: (row: MonthTableRow, category: string) => string
  onDotClick: (e: React.SyntheticEvent<HTMLElement>, row: MonthTableRow) => void
  onCycleLocation: (date: string) => void
  onOpenCategoryDialog: (date: string, category: string) => void
  onOpenNotePopover: (state: NotePopoverState) => void
}

export function MonthTableDataRow({
  row,
  todayIso,
  monthData,
  repository,
  customCategories,
  categoryOrder,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  allCategories,
  workLocations,
  defaultWorkLocation,
  dayNotes,
  timeFormat,
  balScale,
  showOfficeStats,
  onNoteChange,
  onClearDay,
  renderDayCell,
  getCellValue,
  onDotClick,
  onCycleLocation,
  onOpenCategoryDialog,
  onOpenNotePopover,
}: MonthTableDataRowProps) {
  const isToday = row.date === todayIso
  const classified = classifyRow(row, todayIso)
  const { displayStatus } = classified
  const dim = isDimRow(row)
  const dayLabel = new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' })
  const rowDelta = dayDelta(row.workedHours, row.targetHours, row.accumulatedOvertime)
  const daySummaryData = buildDaySummaryData(row, classified, categoryDescriptions, preferCategoryDescriptionAsPrimary)
  const note = dayNotes.get(row.date)
  return (
    <tr key={row.date} aria-label={row.date} className={rowClassName(row, isToday, dim)}>
      {renderDayCell(row.date, dayLabel, isToday)}
      <td
        className={`sticky left-[3.6rem] z-10 ${STICKY_BG} px-1 py-[3px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
        onClick={(e) => onDotClick(e, row)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onDotClick(e, row)
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
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        daySummaryData={daySummaryData}
        targetHours={row.targetHours}
        className={workedHoursCellClassName(isToday)}
      />
      <DeltaCell rowDelta={rowDelta} timeFormat={timeFormat} />
      <BalanceCell
        accumulatedOvertime={row.accumulatedOvertime}
        balScale={balScale}
        timeFormat={timeFormat}
        daySummaryData={daySummaryData}
      />
      {allCategories.map((cat, catIdx) => {
        const isAutoTarget = cat === row.resolvedAutoCategory
        const val = getCellValue(row, cat)
        const catBorderClass = catIdx > 0 ? 'border-l border-dashed border-gray-300 dark:border-gray-600' : ''
        return (
          <td
            key={cat}
            className={`px-1 py-[3px] w-14 min-w-[3.5rem] max-w-[3.5rem] cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 ${catBorderClass} ${isAutoTarget && row.autoCategoryHours > 0 ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
            onClick={() => onOpenCategoryDialog(row.date, cat)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenCategoryDialog(row.date, cat)
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
      <LocationCell
        visible={showOfficeStats}
        date={row.date}
        workLocations={workLocations}
        defaultWorkLocation={defaultWorkLocation}
        onCycleLocation={onCycleLocation}
      />
      <NoteCell date={row.date} note={note} onNoteChange={onNoteChange} onOpenNotePopover={onOpenNotePopover} />
      <ClearCell date={row.date} onClearDay={onClearDay} />
    </tr>
  )
}
