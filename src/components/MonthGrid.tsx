import { useState, useRef, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, WorkLocation } from '../repositories/types'
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

const DAY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'WorkDay', label: 'Work Day' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'SickDay', label: 'Sick Day' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
  { value: 'Absence', label: 'Absence' },
]

interface CategoryColumnHeaderProps {
  cat: string
  catIdx: number
  autoCategory: string
  editingCat: string | null
  editValue: string
  colDragOverIdx: number | null
  categoryDescriptions?: Record<string, string>
  onCategoryReorder?: (order: string[]) => void
  onCategoryRename?: (oldName: string, newName: string) => void
  onAutoCategoryChange?: (category: string) => void
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number, allCats: string[]) => void
  onDragEnd: () => void
  allCategories: string[]
  onEditValueChange: (v: string) => void
  onCommitRename: (cat: string) => void
  onSetEditingCat: (cat: string | null) => void
}

function CategoryBadge({ cat, isAuto, onAutoCategoryChange }: { cat: string; isAuto: boolean; onAutoCategoryChange?: (cat: string) => void }) {
  if (isAuto) return <span className="text-[9px] text-indigo-400 dark:text-indigo-300 font-medium tracking-wide leading-none">auto</span>
  if (onAutoCategoryChange) return (
    <button
      onClick={(e) => { e.stopPropagation(); onAutoCategoryChange(cat) }}
      className="text-[9px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-300 leading-none transition-colors"
      title={`Set "${cat}" as auto category`}
    >○</button>
  )
  return <span className="text-[9px] leading-none">&nbsp;</span>
}

function buildColTitle(cat: string, autoCategory: string, categoryDescriptions?: Record<string, string>, onCategoryRename?: (o: string, n: string) => void): string {
  if (cat === autoCategory) return [`${cat} — auto category (absorbs remaining hours)`, categoryDescriptions?.[cat]].filter(Boolean).join('\n\n')
  return [categoryDescriptions?.[cat], onCategoryRename ? 'Double-click to rename' : undefined].filter(Boolean).join('\n\n') || cat
}

function CategoryColumnHeader({ cat, catIdx, autoCategory, editingCat, editValue, colDragOverIdx, categoryDescriptions, onCategoryReorder, onCategoryRename, onAutoCategoryChange, onDragStart, onDragOver, onDrop, onDragEnd, allCategories, onEditValueChange, onCommitRename, onSetEditingCat }: CategoryColumnHeaderProps) {
  const isAuto = cat === autoCategory
  const dragClass = onCategoryReorder ? 'cursor-grab active:cursor-grabbing' : ''
  const dragOverClass = colDragOverIdx === catIdx ? 'bg-indigo-50 dark:bg-indigo-900/40' : ''
  const nameClass = `block truncate text-xs ${onCategoryRename ? 'cursor-text' : ''}`
  return (
    <th
      draggable={editingCat !== cat && !!onCategoryReorder}
      onDragStart={() => onDragStart(catIdx)}
      onDragOver={(e) => onDragOver(e, catIdx)}
      onDrop={() => onDrop(catIdx, allCategories)}
      onDragEnd={onDragEnd}
      className={`px-1 py-1.5 text-right w-16 min-w-[4rem] max-w-[4rem] border-b dark:border-gray-700 select-none ${dragClass} ${dragOverClass}`}
      role="columnheader"
      title={buildColTitle(cat, autoCategory, categoryDescriptions, onCategoryRename)}
    >
      {editingCat === cat ? (
        <input
          ref={(el) => { el?.focus() }}
          type="text"
          aria-label={`Rename category ${cat}`}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={() => onCommitRename(cat)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(cat)
            if (e.key === 'Escape') onSetEditingCat(null)
          }}
          className="w-full bg-transparent text-xs border-b border-indigo-400 dark:border-indigo-500 focus:outline-none text-left"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={nameClass} onDoubleClick={() => { if (onCategoryRename) { onSetEditingCat(cat); onEditValueChange(cat) } }}>
          {cat}
        </span>
      )}
      <span aria-hidden="true" className="flex justify-center items-center h-[13px] mt-0.5">
        <CategoryBadge cat={cat} isAuto={isAuto} onAutoCategoryChange={onAutoCategoryChange} />
      </span>
    </th>
  )
}

interface Props {
  year: number
  month: number
  repository: MonthRepository
  autoCategory: string
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

interface NotePopoverState {
  date: string
  value: string
  top: number
  left: number
}

interface DotPopoverPanelProps {
  state: DotPopoverState | null
  popoverRef: React.RefObject<HTMLDivElement | null>
  onSelectDayType: (value: string) => void
}

function DotPopoverPanel({ state, popoverRef, onSelectDayType }: DotPopoverPanelProps) {
  if (!state) return null
  return (
    <div
      ref={popoverRef}
      style={{ top: state.top, left: state.left }}
      className="fixed z-[300] w-52 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[state.displayStatus]}`} aria-hidden="true" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{STATUS_LABEL[state.displayStatus]}</span>
      </div>
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">{state.reason}</p>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Day type</p>
      <div className="flex flex-wrap gap-1">
        {DAY_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelectDayType(opt.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              state.currentDayType === opt.value
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface NotePopoverPanelProps {
  state: NotePopoverState | null
  popoverRef: React.RefObject<HTMLDivElement | null>
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

function NotePopoverPanel({ state, popoverRef, onChange, onSave, onClose }: NotePopoverPanelProps) {
  if (!state) return null
  return (
    <div
      ref={popoverRef}
      style={{ top: state.top, left: state.left }}
      className="fixed z-[300] w-64 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Note for {state.date}</p>
      <textarea
        className="w-full rounded border px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 resize-none"
        rows={4}
        value={state.value}
        onChange={(e) => onChange(e.target.value)}
        ref={(el) => el?.focus()}
        placeholder="Add a note…"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave()
        }}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="rounded border px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">
          Cancel
        </button>
        <button
          onClick={onSave}
          className="rounded border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
        >
          Save
        </button>
      </div>
    </div>
  )
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

  useEffect(() => {
    if (!notePopover) return
    function handleClick(e: MouseEvent) {
      if (notePopoverRef.current && e.target instanceof Node && !notePopoverRef.current.contains(e.target)) {
        setNotePopover(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notePopover])

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
                  onDragStart={handleColDragStart}
                  onDragOver={handleColDragOver}
                  onDrop={handleColDrop}
                  onDragEnd={handleColDragEnd}
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
                const displayStatus = getDisplayStatus(row)
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
