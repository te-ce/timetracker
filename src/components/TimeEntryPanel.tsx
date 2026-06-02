import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  TimeEntry,
  MonthRepository,
  TimeTrackingRepository,
} from '../repositories/types'
import type { ActiveTracking } from '../repositories/types'
import { getAllCategories } from '../domain/categories'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'
import { useTrackingMutations } from '../hooks/useTrackingMutations'

export interface PanelCallbacks {
  onAutoCategoryChange?: (cat: string | null) => void
  onCategoryReorder?: (order: string[]) => void
  onCategoryDescriptionChange?: (category: string, description: string) => void
  onCategoryRename?: (oldName: string, newName: string) => void
}

interface Props {
  date: string
  entries: TimeEntry[]
  repository: MonthRepository
  timeTrackingRepository: TimeTrackingRepository
  activeTracking: ActiveTracking | null
  customCategories?: string[]
  categoryOrder?: string[]
  categoryDescriptions?: Record<string, string>
  autoCategory?: string | null
  autoCategoryHours?: number
  callbacks?: PanelCallbacks
}

interface CategoryRowProps {
  category: string
  idx: number
  date: string
  entries: TimeEntry[]
  activeTracking: ActiveTracking | null
  autoCategory: string | null
  autoCategoryHours: number
  draft: Record<string, string | undefined>
  dragOverIdx: number | null
  onCategoryReorder: ((order: string[]) => void) | undefined
  onAutoCategoryChange: ((cat: string | null) => void) | undefined
  onCategoryDescriptionChange: ((category: string, description: string) => void) | undefined
  onCategoryRename: ((oldName: string, newName: string) => void) | undefined
  categories: string[]
  categoryDescription?: string
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number, categories: string[]) => void
  onDragEnd: () => void
  onSave: (category: string) => void
  onIncrement: (category: string, delta: number) => void
  onDraftChange: (category: string, value: string) => void
  onDelete: (entry: TimeEntry) => void
  onStopTracking: () => void
  onStartTracking: (category: string) => void
}

function findEntry(entries: TimeEntry[], category: string): TimeEntry | undefined {
  return entries.find((e) => e.category === category)
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function rowClassName(isTracking: boolean, isAutoTarget: boolean, autoHrs: number, dragOverIdx: number | null, idx: number, hasReorder: boolean): string {
  let stateClass = 'bg-white dark:bg-gray-800 dark:border-gray-700'
  if (isTracking) stateClass = 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
  else if (isAutoTarget && autoHrs > 0) stateClass = 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 dark:border-indigo-700'
  else if (dragOverIdx === idx) stateClass = 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/30'
  const grabClass = hasReorder ? 'cursor-grab active:cursor-grabbing' : ''
  return `flex items-center justify-between rounded-lg border px-3 py-2.5 shadow-sm transition-colors ${stateClass} ${grabClass}`
}

function AutoCategoryButton({ category, isAutoTarget, onAutoCategoryChange }: { category: string; isAutoTarget: boolean; onAutoCategoryChange: (cat: string | null) => void }) {
  const title = isAutoTarget ? 'Unset auto category' : 'Set as auto category'
  const label = isAutoTarget ? `Unset ${category} as auto category` : `Set ${category} as auto category`
  const activeClass = 'text-indigo-600 dark:text-indigo-400 hover:text-gray-400 dark:hover:text-gray-500'
  const inactiveClass = 'text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-300'
  return (
    <button
      title={title}
      aria-label={label}
      onClick={() => onAutoCategoryChange(isAutoTarget ? null : category)}
      className={`text-base leading-none transition-colors ${isAutoTarget ? activeClass : inactiveClass}`}
    >
      {isAutoTarget ? '◉' : '○'}
    </button>
  )
}

interface CategoryLabelSectionProps {
  category: string
  categoryDescription?: string
  isAutoTarget: boolean
  autoHrs: number
  activeTracking: ActiveTracking | null
  isTracking: boolean
  onCategoryReorder: ((order: string[]) => void) | undefined
  onAutoCategoryChange: ((cat: string | null) => void) | undefined
  onCategoryDescriptionChange: ((category: string, description: string) => void) | undefined
  onCategoryRename: ((oldName: string, newName: string) => void) | undefined
}

function CategoryDescriptionEditor({ category, categoryDescription, onChange }: { category: string; categoryDescription?: string; onChange: (cat: string, desc: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = useCallback(() => {
    setDraft(categoryDescription ?? '')
    setEditing(true)
  }, [categoryDescription])

  const commit = useCallback(() => {
    setEditing(false)
    onChange(category, draft.trim())
  }, [category, draft, onChange])

  if (editing) {
    return (
      <input
        ref={(el) => el?.focus()}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label={`Description for ${category}`}
        className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-indigo-400 dark:border-indigo-500 focus:outline-none w-48"
      />
    )
  }
  if (categoryDescription) {
    return (
      <button onClick={startEdit} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-left truncate max-w-48" aria-label={`Edit description for ${category}`} title="Click to edit description">
        {categoryDescription}
      </button>
    )
  }
  return (
    <button onClick={startEdit} className="text-[10px] text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0" aria-label={`Add description for ${category}`}>
      + add description
    </button>
  )
}

function CategoryNameLabel({ category, onCategoryRename }: { category: string; onCategoryRename?: (o: string, n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = useCallback(() => {
    if (!onCategoryRename) return
    setDraft(category)
    setEditing(true)
  }, [category, onCategoryRename])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== category) onCategoryRename?.(category, trimmed)
  }, [category, draft, onCategoryRename])

  if (editing) {
    return (
      <input
        ref={(el) => el?.focus()}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label={`Rename category ${category}`}
        className="text-sm font-medium bg-transparent border-b border-indigo-400 dark:border-indigo-500 focus:outline-none w-32 shrink-0"
      />
    )
  }
  return (
    <span
      className={`text-sm font-medium shrink-0 ${onCategoryRename ? 'cursor-text' : ''}`}
      onDoubleClick={startEdit}
      title={onCategoryRename ? 'Double-click to rename' : undefined}
    >
      {category}
    </span>
  )
}

function CategoryLabelSection({ category, categoryDescription, isAutoTarget, autoHrs, activeTracking, isTracking, onCategoryReorder, onAutoCategoryChange, onCategoryDescriptionChange, onCategoryRename }: CategoryLabelSectionProps) {
  const showAutoHours = isAutoTarget && autoHrs > 0
  const showElapsed = activeTracking !== null && isTracking

  return (
    <div className="flex flex-1 items-center gap-2 group/desc min-w-0">
      {onCategoryReorder && (
        <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>⠿</span>
      )}
      {onAutoCategoryChange && (
        <AutoCategoryButton category={category} isAutoTarget={isAutoTarget} onAutoCategoryChange={onAutoCategoryChange} />
      )}
      <CategoryNameLabel category={category} onCategoryRename={onCategoryRename} />
      {onCategoryDescriptionChange && (
        <CategoryDescriptionEditor category={category} categoryDescription={categoryDescription} onChange={onCategoryDescriptionChange} />
      )}
      {showAutoHours && (
        <span className="rounded bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 shrink-0">
          +{autoHrs.toFixed(2)} auto
        </span>
      )}
      {showElapsed && (
        <span className="rounded bg-green-200 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] font-bold text-green-800 dark:text-green-400 tabular-nums shrink-0">
          ⏱ {formatElapsed(activeTracking.startedAt)}
        </span>
      )}
    </div>
  )
}

interface CategoryControlSectionProps {
  category: string
  isTracking: boolean
  isAutoTarget: boolean
  autoHrs: number
  displayTotal: number
  value: string
  existing: TimeEntry | undefined
  onSave: (category: string) => void
  onIncrement: (category: string, delta: number) => void
  onDraftChange: (category: string, value: string) => void
  onDelete: (entry: TimeEntry) => void
  onStopTracking: () => void
  onStartTracking: (category: string) => void
}

function CategoryControlSection({ category, isTracking, isAutoTarget, autoHrs, displayTotal, value, existing, onSave, onIncrement, onDraftChange, onDelete, onStopTracking, onStartTracking }: CategoryControlSectionProps) {
  return (
    <div className="flex items-center gap-1">
      {isTracking ? (
        <button
          aria-label={`Stop tracking ${category}`}
          onClick={onStopTracking}
          className="rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
        >
          ⏹ Stop
        </button>
      ) : (
        <button
          aria-label={`Start tracking ${category}`}
          onClick={() => onStartTracking(category)}
          className="rounded border border-green-300 dark:border-green-700 bg-green-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-emerald-400 hover:bg-green-100 dark:hover:bg-emerald-900/40"
        >
          ▶ Start
        </button>
      )}
      <button
        aria-label={`Decrease ${category}`}
        onClick={() => onIncrement(category, -0.25)}
        className="rounded border px-2 py-0.5 text-sm font-bold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        −
      </button>
      <input
        aria-label={`Hours for ${category}`}
        type="number"
        min="0"
        step="0.25"
        placeholder="0"
        value={value}
        onChange={(e) => onDraftChange(category, e.target.value)}
        onBlur={() => onSave(category)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(category)
        }}
        className="w-16 rounded border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
      />
      <button
        aria-label={`Increase ${category}`}
        onClick={() => onIncrement(category, 0.25)}
        className="rounded border px-2 py-0.5 text-sm font-bold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        +
      </button>
      <button
        aria-label={`Clear ${category}`}
        onClick={() => existing && onDelete(existing)}
        className={`rounded border px-2 py-0.5 text-sm text-gray-400 dark:text-gray-500 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:text-red-500 dark:hover:text-red-400 ${existing ? '' : 'invisible'}`}
      >
        ×
      </button>
      <span className={`ml-1 text-xs text-gray-500 dark:text-gray-400 ${isAutoTarget && autoHrs > 0 ? '' : 'invisible'}`}>= {displayTotal.toFixed(2)}</span>
    </div>
  )
}

function CategoryRow({
  category,
  idx,
  date,
  entries,
  activeTracking,
  autoCategory,
  autoCategoryHours,
  draft,
  dragOverIdx,
  onCategoryReorder,
  onAutoCategoryChange,
  onCategoryDescriptionChange,
  onCategoryRename,
  categories,
  categoryDescription,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSave,
  onIncrement,
  onDraftChange,
  onDelete,
  onStopTracking,
  onStartTracking,
}: CategoryRowProps) {
  const existing = findEntry(entries, category)
  const isAutoTarget = autoCategory === category
  const autoHrs = isAutoTarget ? autoCategoryHours : 0
  const manualHours = existing ? existing.hours : 0
  const displayTotal = manualHours + autoHrs
  const value = draft[category] !== undefined ? draft[category] : (existing ? String(existing.hours) : '')
  const isTracking =
    activeTracking !== null && activeTracking.category === category && activeTracking.date === date

  return (
    <li
      key={category}
      draggable={!!onCategoryReorder}
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={() => onDrop(idx, categories)}
      onDragEnd={onDragEnd}
      className={rowClassName(isTracking, isAutoTarget, autoHrs, dragOverIdx, idx, !!onCategoryReorder)}
    >
      <CategoryLabelSection
        category={category}
        categoryDescription={categoryDescription}
        isAutoTarget={isAutoTarget}
        autoHrs={autoHrs}
        activeTracking={activeTracking}
        isTracking={isTracking}
        onCategoryReorder={onCategoryReorder}
        onAutoCategoryChange={onAutoCategoryChange}
        onCategoryDescriptionChange={onCategoryDescriptionChange}
        onCategoryRename={onCategoryRename}
      />
      <CategoryControlSection
        category={category}
        isTracking={isTracking}
        isAutoTarget={isAutoTarget}
        autoHrs={autoHrs}
        displayTotal={displayTotal}
        value={value}
        existing={existing}
        onSave={onSave}
        onIncrement={onIncrement}
        onDraftChange={onDraftChange}
        onDelete={onDelete}
        onStopTracking={onStopTracking}
        onStartTracking={onStartTracking}
      />
    </li>
  )
}

export function TimeEntryPanel({
  date,
  entries,
  repository,
  timeTrackingRepository,
  activeTracking,
  customCategories = [],
  categoryOrder,
  categoryDescriptions,
  autoCategory = null,
  autoCategoryHours = 0,
  callbacks,
}: Props) {
  const { onAutoCategoryChange, onCategoryReorder, onCategoryDescriptionChange, onCategoryRename } = callbacks ?? {}
  const [draft, setDraft] = useState<Record<string, string | undefined>>({})
  const [tick, setTick] = useState(0)
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!activeTracking) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTracking])

  void tick

  const { save: saveMutation, remove: deleteMutation } = useTimeEntryMutations(repository)
  const trackingMutations = useTrackingMutations(date, repository, timeTrackingRepository)

  function handleSave(category: string) {
    const raw = draft[category] ?? ''
    const hours = parseFloat(raw)
    const existing = findEntry(entries, category)

    if (isNaN(hours) || hours === 0) {
      if (existing) deleteMutation.mutate({ date, entry: existing })
    } else {
      saveMutation.mutate({
        date,
        entry: { id: existing?.id ?? crypto.randomUUID(), category, hours },
        previous: existing ?? null,
      })
    }

    setDraft((d) => ({ ...d, [category]: undefined }))
  }

  function handleIncrement(category: string, delta: number) {
    const existing = findEntry(entries, category)
    const current = existing?.hours ?? 0
    const newHours = Math.max(0, current + delta)

    if (newHours === 0) {
      if (existing) deleteMutation.mutate({ date, entry: existing })
    } else {
      saveMutation.mutate({
        date,
        entry: { id: existing?.id ?? crypto.randomUUID(), category, hours: newHours },
        previous: existing ?? null,
      })
    }
    setDraft((d) => ({ ...d, [category]: undefined }))
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number, categories: string[]) {
    const from = dragIdx.current
    if (from === null || from === idx) {
      dragIdx.current = null
      setDragOverIdx(null)
      return
    }
    const newOrder = [...categories]
    const spliced = newOrder.splice(from, 1)
    const moved = spliced[0]
    if (moved === undefined) return
    newOrder.splice(idx, 0, moved)
    onCategoryReorder?.(newOrder)
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  const categories = getAllCategories(customCategories, categoryOrder)
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0) + autoCategoryHours

  return (
    <section aria-label="Time entries" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {categories.map((category, idx) => (
          <CategoryRow
            key={category}
            category={category}
            idx={idx}
            date={date}
            entries={entries}
            activeTracking={activeTracking}
            autoCategory={autoCategory}
            autoCategoryHours={autoCategoryHours}
            draft={draft}
            dragOverIdx={dragOverIdx}
            onCategoryReorder={onCategoryReorder}
            onAutoCategoryChange={onAutoCategoryChange}
            onCategoryDescriptionChange={onCategoryDescriptionChange}
            onCategoryRename={onCategoryRename}
            categories={categories}
            categoryDescription={categoryDescriptions?.[category]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onSave={handleSave}
            onIncrement={handleIncrement}
            onDraftChange={(cat, value) => setDraft((d) => ({ ...d, [cat]: value }))}
            onDelete={(entry) => {
              deleteMutation.mutate({ date, entry })
              setDraft((d) => ({ ...d, [category]: undefined }))
            }}
            onStopTracking={() => trackingMutations.stop.mutate()}
            onStartTracking={(cat) => trackingMutations.start.mutate(cat)}
          />
        ))}
      </ul>

      {totalHours > 0 && (
        <div
          aria-label="Total booked hours"
          className="rounded-lg border bg-indigo-50 dark:bg-indigo-900/40 dark:border-indigo-700 px-4 py-3 text-right text-sm font-semibold"
        >
          Total: {totalHours}h
        </div>
      )}
    </section>
  )
}
