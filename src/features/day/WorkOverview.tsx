import { useState, useRef, useEffect } from 'react'
import type { WorkPeriod, WorkPeriodSubtask, MonthRepository } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'
import { mergeAdjacentInto } from './workPeriodMerge'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { calculateWorkedHours, calcSubtaskHours, findOpenPeriod } from '../../shared/worktime'
import { getAllCategories } from '../../shared/categories'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { Tooltip } from '../../shared'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined | undefined
}

type LiveSubtask = WorkPeriodSubtask & { startedAt: string; stoppedAt?: undefined }
type TimedSubtask = WorkPeriodSubtask & { startedAt: string; stoppedAt: string }

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function minutesFrom(t: string): number {
  const parts = t.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

function isAfter(a: string, b: string): boolean {
  return minutesFrom(a) > minutesFrom(b)
}

function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim()
  const hhmmMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1] ?? '0')
    const m = parseInt(hhmmMatch[2] ?? '0')
    return h + m / 60
  }
  const num = parseFloat(trimmed)
  if (!isNaN(num) && num > 0) return num
  return null
}

function elapsedDisplay(startedAt: string, nowTime: string): string {
  let startMins = minutesFrom(startedAt)
  let endMins = minutesFrom(nowTime)
  if (endMins < startMins) endMins += 24 * 60
  const total = endMins - startMins
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function isLiveSubtask(s: WorkPeriodSubtask): s is LiveSubtask {
  return !!s.startedAt && !s.stoppedAt
}

function isTimedSubtask(s: WorkPeriodSubtask): s is TimedSubtask {
  return !!s.startedAt && !!s.stoppedAt
}

function useNow(): string {
  const [now, setNow] = useState(nowHHMM)
  useEffect(() => {
    const id = setInterval(() => setNow(nowHHMM()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ─── Category Picker ──────────────────────────────────────────────────────────

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
  categoryDescriptions?: Record<string, string> | undefined
}

function CategoryPicker({ value, categories, onChange, compact, categoryDescriptions }: CategoryPickerProps) {
  const selectClass = compact
    ? 'text-xs rounded border px-1 py-0.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[10rem]'
    : 'text-sm rounded-lg border px-2 py-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[8rem] max-w-[14rem]'

  return (
    <select aria-label="Category" value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value={UNCATEGORIZED_CATEGORY}>Uncategorized</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {categoryDescriptions?.[c] ? `${c} (${categoryDescriptions[c]})` : c}
        </option>
      ))}
    </select>
  )
}

// ─── Stop Subtask Form ──────────────────────────────────────────────────────────

interface StopSubtaskFormProps {
  subtaskStartedAt: string
  onStop: (stoppedAt: string) => void
  onCancel: () => void
}

function StopSubtaskForm({ subtaskStartedAt, onStop, onCancel }: StopSubtaskFormProps) {
  const [stoppedAt, setStoppedAt] = useState(nowHHMM)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleStop() {
    if (!stoppedAt || minutesFrom(stoppedAt) < minutesFrom(subtaskStartedAt)) {
      setError(true)
      return
    }
    onStop(stoppedAt)
  }

  return (
    <>
      <span className="text-xs text-gray-500 dark:text-gray-400">Stopped at</span>
      <input
        ref={inputRef}
        type="time"
        value={stoppedAt}
        onChange={(e) => {
          setStoppedAt(e.target.value)
          setError(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStop()
          if (e.key === 'Escape') onCancel()
        }}
        aria-label="Subtask stopped at"
        className={`rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">Must be at or after {subtaskStartedAt}</span>}
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
      <button
        onClick={handleStop}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Confirm
      </button>
    </>
  )
}

// ─── Stop Period Form ─────────────────────────────────────────────────────────

interface StopPeriodFormProps {
  periodStart: string
  liveSubtask: LiveSubtask | undefined
  onStop: (stopTime: string) => void
  onCancel: () => void
}

function StopPeriodForm({ periodStart, liveSubtask, onStop, onCancel }: StopPeriodFormProps) {
  const [stopTime, setStopTime] = useState(nowHHMM)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleStop() {
    const baseTime = liveSubtask && isAfter(liveSubtask.startedAt, periodStart) ? liveSubtask.startedAt : periodStart
    if (!stopTime || !isAfter(stopTime, baseTime)) {
      setError(true)
      return
    }
    onStop(stopTime)
  }

  return (
    <>
      <span className="text-xs text-gray-500 dark:text-gray-400">Ended at</span>
      <input
        ref={inputRef}
        type="time"
        value={stopTime}
        onChange={(e) => {
          setStopTime(e.target.value)
          setError(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStop()
          if (e.key === 'Escape') onCancel()
        }}
        aria-label="Period ended at"
        className={`rounded border px-1.5 py-0.5 text-xs w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">Must be after {periodStart}</span>}
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
      <button
        onClick={handleStop}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Confirm
      </button>
    </>
  )
}

// ─── Live Subtask Banner ────────────────────────────────────────────────────────

interface LiveSubtaskBannerProps {
  subtask: LiveSubtask
  periodId: string
  date: string
  nowTime: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
}

function LiveSubtaskBanner({
  subtask,
  periodId,
  date,
  nowTime,
  categories,
  mutations,
  categoryDescriptions,
}: LiveSubtaskBannerProps) {
  const [stopping, setStopping] = useState(false)
  const [editingCategory, setEditingCategory] = useState(false)
  const elapsed = elapsedDisplay(subtask.startedAt, nowTime)
  const description = categoryDescriptions?.[subtask.category]

  function changeCategory(cat: string) {
    mutations.addSubtask.mutate({ date, periodId, subtask: { ...subtask, category: cat } })
    setEditingCategory(false)
  }

  return (
    <div data-testid="live-subtask-banner" className="flex flex-col gap-1 mb-2 pb-2 border-b dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs tabular-nums shrink-0 min-w-[2.5rem] text-right flex items-center justify-end gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-green-600 dark:text-green-400 font-semibold">{elapsed}</span>
        </span>
        <span className="flex-1 leading-tight min-w-0">
          {editingCategory ? (
            <CategoryPicker
              value={subtask.category}
              categories={categories}
              onChange={changeCategory}
              compact
              categoryDescriptions={categoryDescriptions}
            />
          ) : (
            <button
              onClick={() => setEditingCategory(true)}
              className="font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
            >
              <span className="block">{subtask.category}</span>
              {description && (
                <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">{description}</span>
              )}
            </button>
          )}
        </span>
        {stopping ? (
          <StopSubtaskForm
            subtaskStartedAt={subtask.startedAt}
            onStop={(stoppedAt) => {
              mutations.stopLiveSubtask.mutate({ date, periodId, subtaskId: subtask.id, stoppedAt })
              setStopping(false)
            }}
            onCancel={() => setStopping(false)}
          />
        ) : (
          <>
            <button
              onClick={() => setStopping(true)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 shrink-0"
            >
              Stop subtask
            </button>
            <button
              onClick={() => mutations.deleteSubtask.mutate({ date, periodId, subtaskId: subtask.id })}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-base leading-none shrink-0"
              aria-label="Delete live subtask"
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Start Subtask Form ─────────────────────────────────────────────────────────

interface StartSubtaskFormProps {
  categories: string[]
  defaultCategory: string
  onStart: (subtask: LiveSubtask) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string> | undefined
}

function StartSubtaskForm({
  categories,
  defaultCategory,
  onStart,
  onCancel,
  categoryDescriptions,
}: StartSubtaskFormProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [startedAt, setStartedAt] = useState(nowHHMM)

  function handleStart() {
    onStart({ id: crypto.randomUUID(), category, hours: 0, startedAt })
  }

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onCancel()
      }}
    >
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        categoryDescriptions={categoryDescriptions}
      />
      <input
        type="time"
        value={startedAt}
        onChange={(e) => setStartedAt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStart()
          if (e.key === 'Escape') onCancel()
        }}
        aria-label="Subtask started at"
        className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <button
        onClick={handleStart}
        className="text-xs text-green-600 dark:text-green-400 font-medium hover:text-green-800 dark:hover:text-green-300"
      >
        Start
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Subtask Row (display + inline edit) ────────────────────────────────────────

interface SubtaskRowProps {
  sl: WorkPeriodSubtask
  index: number
  periodId: string
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
}

function resolveSubtaskEdit(
  sl: WorkPeriodSubtask,
  category: string,
  note: string | undefined,
  start: string,
  end: string,
  hoursRaw: string,
  submode: 'timed' | 'decimal',
): { subtask: WorkPeriodSubtask; valid: boolean } {
  if (submode === 'timed') {
    const h = calcSubtaskHours(start, end)
    if (!h || h <= 0) return { subtask: sl, valid: false }
    return { subtask: { ...sl, category, hours: h, startedAt: start, stoppedAt: end, note }, valid: true }
  }
  const h = parseDurationInput(hoursRaw)
  if (!h || h <= 0) return { subtask: sl, valid: false }
  return { subtask: { ...sl, category, hours: h, startedAt: undefined, stoppedAt: undefined, note }, valid: true }
}

interface SubtaskEditFormProps {
  sl: WorkPeriodSubtask
  periodId: string
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  stripeBg: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  onDone: () => void
}

function SubtaskEditForm({
  sl,
  periodId,
  date,
  categories,
  categoryDescriptions,
  stripeBg,
  mutations,
  onDone,
}: SubtaskEditFormProps) {
  const timed = isTimedSubtask(sl)
  const [editCategory, setEditCategory] = useState(sl.category)
  const [editHours, setEditHours] = useState(String(sl.hours))
  const [editNote, setEditNote] = useState(sl.note ?? '')
  const [editStart, setEditStart] = useState(sl.startedAt ?? '')
  const [editEnd, setEditEnd] = useState(sl.stoppedAt ?? '')
  const [submode, setSubmode] = useState<'timed' | 'decimal'>(timed ? 'timed' : 'decimal')
  const hoursInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)
  const timeFormat = useTimeFormatStore((s) => s.format)

  useEffect(() => {
    if (submode === 'timed') endInputRef.current?.focus()
    else hoursInputRef.current?.focus()
  }, [submode])

  function commit() {
    const { subtask, valid } = resolveSubtaskEdit(
      sl,
      editCategory,
      editNote.trim() || undefined,
      editStart,
      editEnd,
      editHours,
      submode,
    )
    if (!valid) {
      onDone()
      return
    }
    mutations.addSubtask.mutate({ date, periodId, subtask })
    onDone()
  }

  function switchToDecimal() {
    setEditHours(String(Math.round(calcSubtaskHours(editStart, editEnd) * 100) / 100))
    setSubmode('decimal')
  }

  const inputClass =
    'text-xs rounded border px-2 py-0.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400'
  const kd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') onDone()
  }

  return (
    <div
      className={`flex flex-col gap-1 text-sm py-0.5 ${stripeBg}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) commit()
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {timed && submode === 'timed' ? (
          <>
            <input
              type="text"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              onKeyDown={kd}
              aria-label="Subtask start time"
              className={`${inputClass} w-16`}
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="text"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              onKeyDown={kd}
              aria-label="Subtask end time"
              ref={endInputRef}
              className={`${inputClass} w-16`}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {formatHours(calcSubtaskHours(editStart, editEnd), timeFormat)}
            </span>
          </>
        ) : (
          <input
            type="text"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            onKeyDown={kd}
            aria-label="Subtask hours"
            ref={hoursInputRef}
            className={`${inputClass} w-20`}
          />
        )}
        <CategoryPicker
          value={editCategory}
          categories={categories}
          onChange={setEditCategory}
          compact
          categoryDescriptions={categoryDescriptions}
        />
        <button
          onClick={commit}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800"
        >
          Save
        </button>
        <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          Cancel
        </button>
      </div>
      <div className="flex items-center gap-2 pl-3.5">
        <input
          type="text"
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          onKeyDown={kd}
          placeholder="Note (optional)"
          aria-label="Subtask note"
          className={`${inputClass} flex-1 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
        />
        {timed && submode === 'timed' && (
          <button
            onClick={switchToDecimal}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 shrink-0"
          >
            use decimal
          </button>
        )}
      </div>
    </div>
  )
}

function SubtaskRow({ sl, index, periodId, date, categories, mutations, categoryDescriptions }: SubtaskRowProps) {
  const [editing, setEditing] = useState(false)
  const timed = isTimedSubtask(sl)
  const stripeBg = index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50 rounded -mx-2 px-2' : ''
  const timeFormat = useTimeFormatStore((s) => s.format)
  const categoryDescription = categoryDescriptions?.[sl.category]

  if (editing) {
    return (
      <SubtaskEditForm
        sl={sl}
        periodId={periodId}
        date={date}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        stripeBg={stripeBg}
        mutations={mutations}
        onDone={() => setEditing(false)}
      />
    )
  }

  return (
    <div data-testid="subtask-row" className={`flex items-center gap-2 text-sm group/slice py-1.5 ${stripeBg}`}>
      <button
        onClick={() => setEditing(true)}
        className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 tabular-nums shrink-0 min-w-[2.5rem] text-right"
        aria-label={`Edit ${sl.category} hours`}
      >
        {formatHours(sl.hours, timeFormat)}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="flex-1 font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left leading-tight min-w-0"
        aria-label={`Edit ${sl.category} subtask`}
      >
        <span className="block truncate">
          {sl.category}
          {categoryDescription && (
            <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">({categoryDescription})</span>
          )}
          {timed && (
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500 tabular-nums">
              {sl.startedAt}–{sl.stoppedAt}
            </span>
          )}
        </span>
        {sl.note && (
          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 italic">{sl.note}</span>
        )}
      </button>
      <button
        onClick={() => mutations.deleteSubtask.mutate({ date, periodId, subtaskId: sl.id })}
        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-base leading-none self-start shrink-0"
        aria-label={`Remove ${sl.category} subtask`}
      >
        ×
      </button>
    </div>
  )
}

// ─── Add Subtask Form ─────────────────────────────────────────

interface SubtaskFormProps {
  categories: string[]
  onAdd: (subtask: WorkPeriodSubtask) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string> | undefined
}

function SubtaskForm({ categories, onAdd, onCancel, categoryDescriptions }: SubtaskFormProps) {
  const [category, setCategory] = useState(categories[0] ?? UNCATEGORIZED_CATEGORY)
  const [durationRaw, setDurationRaw] = useState('')
  const [note, setNote] = useState('')
  const durationInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    durationInputRef.current?.focus()
  }, [])

  function handleSubmit() {
    const hours = parseDurationInput(durationRaw)
    if (!hours || hours <= 0) return
    onAdd({ id: crypto.randomUUID(), category, hours, note: note.trim() || undefined })
    setDurationRaw('')
    setNote('')
  }

  return (
    <div
      className="flex flex-col gap-1"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onCancel()
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <CategoryPicker
          value={category}
          categories={categories}
          onChange={setCategory}
          compact
          categoryDescriptions={categoryDescriptions}
        />
        <input
          type="text"
          placeholder="1.5 or 1:30"
          value={durationRaw}
          onChange={(e) => setDurationRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          aria-label="Subtask duration"
          ref={durationInputRef}
          className="text-xs rounded border px-2 py-0.5 w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleSubmit}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Note (optional)"
        aria-label="Subtask note"
        className="text-xs rounded border px-2 py-0.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />
    </div>
  )
}

// ─── Period Card Footer ───────────────────────────────────────────────────────

interface PeriodCardFooterProps {
  isRunning: boolean
  periodId: string
  date: string
  categories: string[]
  defaultCategory: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
}

function PeriodCardFooter({
  isRunning,
  periodId,
  date,
  categories,
  defaultCategory,
  mutations,
  categoryDescriptions,
}: PeriodCardFooterProps) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [startingSubtask, setStartingSubtask] = useState(false)

  if (startingSubtask) {
    return (
      <StartSubtaskForm
        categories={categories}
        defaultCategory={defaultCategory}
        categoryDescriptions={categoryDescriptions}
        onStart={(subtask) => {
          mutations.startLiveSubtask.mutate({ date, periodId, subtask })
          setStartingSubtask(false)
        }}
        onCancel={() => setStartingSubtask(false)}
      />
    )
  }

  if (addingSubtask) {
    return (
      <SubtaskForm
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        onAdd={(subtask) => {
          mutations.addSubtask.mutate({ date, periodId, subtask })
          setAddingSubtask(false)
        }}
        onCancel={() => setAddingSubtask(false)}
      />
    )
  }

  return (
    <div className="flex items-center gap-3 mt-0.5">
      {isRunning && (
        <Tooltip content="Start live tracking for a subtask within this period">
          <button
            onClick={() => setStartingSubtask(true)}
            className="text-xs text-green-600 dark:text-green-500 hover:text-green-800 dark:hover:text-green-300 font-medium"
          >
            ▶ Start tracking subtask
          </button>
        </Tooltip>
      )}
      <Tooltip content="Log a completed subtask for this period">
        <button
          onClick={() => setAddingSubtask(true)}
          className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          + Log subtask
        </button>
      </Tooltip>
    </div>
  )
}

// ─── Add Period Form ──────────────────────────────────────────────────────────

interface AddPeriodFormProps {
  openPeriod: WorkPeriod | null
  defaultCategory: string
  categories: string[]
  onAdd: (w: WorkPeriod) => void
}

function AddPeriodForm({ openPeriod, defaultCategory, categories, onAdd }: AddPeriodFormProps) {
  const [draftStart, setDraftStart] = useState(nowHHMM)
  const [draftEnd, setDraftEnd] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [prevDefaultCategory, setPrevDefaultCategory] = useState(defaultCategory)

  if (prevDefaultCategory !== defaultCategory) {
    setPrevDefaultCategory(defaultCategory)
    setCategory(defaultCategory)
  }

  const isLive = !draftEnd
  const canSubmit = !isLive || !openPeriod

  function handleAdd() {
    if (!canSubmit) return
    const start = draftStart || nowHHMM()
    onAdd({ id: crypto.randomUUID(), start, end: draftEnd || null, category, subtasks: [] })
    setDraftStart(nowHHMM())
    setDraftEnd('')
    setCategory(defaultCategory)
  }

  return (
    <div className="border-t dark:border-gray-700 pt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="time"
          value={draftStart}
          onChange={(e) => setDraftStart(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          aria-label="Start"
          className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        />
        <span className="text-gray-400 text-sm">–</span>
        <input
          type="time"
          value={draftEnd}
          onChange={(e) => setDraftEnd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          aria-label="End"
          className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        />
        <CategoryPicker value={category} categories={categories} onChange={setCategory} />
        <button
          onClick={handleAdd}
          disabled={!canSubmit}
          className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-40 whitespace-nowrap"
        >
          {isLive ? 'Start tracking' : 'Add period'}
        </button>
      </div>
    </div>
  )
}

// ─── Card Header ──────────────────────────────────────────────────────────────

function headerBg(isRunning: boolean): string {
  if (isRunning) return 'bg-green-50 dark:bg-green-900/20'
  return 'bg-gray-50 dark:bg-gray-800/60'
}

interface CardHeaderProps {
  w: WorkPeriod
  date: string
  duration: number
  isRunning: boolean
  liveSubtask: LiveSubtask | undefined
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

function CardHeader({ w, date, duration, isRunning, liveSubtask, mutations }: CardHeaderProps) {
  const [editingTime, setEditingTime] = useState(false)
  const [editStart, setEditStart] = useState(w.start)
  const [editEnd, setEditEnd] = useState(w.end ?? '')
  const [stoppingPeriod, setStoppingPeriod] = useState(false)
  const startInputRef = useRef<HTMLInputElement>(null)
  const timeFormat = useTimeFormatStore((s) => s.format)

  useEffect(() => {
    if (editingTime) startInputRef.current?.focus()
  }, [editingTime])

  function saveTime() {
    mutations.saveWithAbsorbed.mutate({ date, window: { ...w, start: editStart, end: editEnd || null }, absorbed: [] })
    setEditingTime(false)
  }

  const showStopButton = isRunning && !stoppingPeriod

  return (
    <div data-testid="period-card-header" className={`px-4 py-3 ${headerBg(isRunning)}`}>
      <div className="flex items-center justify-between min-h-[1.75rem]">
        <div className="flex items-center gap-3 min-w-0">
          {editingTime ? (
            <div
              className="flex items-center gap-1"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) saveTime()
              }}
            >
              <input
                type="time"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTime()
                  if (e.key === 'Escape') setEditingTime(false)
                }}
                aria-label="Edit start time"
                ref={startInputRef}
                className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                type="time"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTime()
                  if (e.key === 'Escape') setEditingTime(false)
                }}
                aria-label="Edit end time"
                className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button onClick={saveTime} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium ml-1">
                Save
              </button>
              <button onClick={() => setEditingTime(false)} className="text-xs text-gray-400 ml-1">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditStart(w.start)
                setEditEnd(w.end ?? '')
                setEditingTime(true)
              }}
              className="group/time flex items-center gap-1.5 font-mono text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
              aria-label={`Edit period ${w.start} to ${w.end ?? 'open end'}`}
            >
              {w.start} – {w.end ?? '--:--'}
              <svg
                className="h-3 w-3 text-gray-400 group-hover/time:text-indigo-500 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="period-duration"
            className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 border dark:border-gray-600 tabular-nums"
          >
            {formatHours(duration, timeFormat)}
          </span>
          {stoppingPeriod ? (
            <StopPeriodForm
              periodStart={w.start}
              liveSubtask={liveSubtask}
              onStop={(stopTime) => {
                mutations.stopPeriod.mutate({
                  date,
                  periodId: w.id,
                  endTime: stopTime,
                  liveSubtaskId: liveSubtask?.id,
                  stoppedAt: liveSubtask ? stopTime : undefined,
                })
                setStoppingPeriod(false)
              }}
              onCancel={() => setStoppingPeriod(false)}
            />
          ) : (
            showStopButton && (
              <button
                onClick={() => setStoppingPeriod(true)}
                aria-label="Stop tracking"
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5"
              >
                Stop
              </button>
            )
          )}
          <button
            onClick={() => mutations.remove.mutate({ date, id: w.id })}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-lg leading-none"
            aria-label="Remove period"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Auto Category Row ────────────────────────────────────────────────────────

function AutoCategoryRow({
  hours,
  isRunning,
  hasLiveSubtask,
  category,
  categories,
  categoryDescriptions,
  periodId,
  date,
  mutations,
  index,
}: {
  hours: number
  isRunning: boolean
  hasLiveSubtask: boolean
  category: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  periodId: string
  date: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  index: number
}) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const stripeBg = index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50 rounded -mx-2 px-2' : ''

  return (
    <div data-testid="auto-category-row" className={`flex items-center gap-2 text-sm py-1.5 ${stripeBg}`}>
      <span className="font-mono text-xs tabular-nums shrink-0 min-w-[2.5rem] text-right flex items-center justify-end gap-1">
        {isRunning && !hasLiveSubtask && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
        )}
        <span
          className={
            isRunning ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-400'
          }
        >
          {formatHours(hours, timeFormat)}
        </span>
      </span>
      <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded px-1.5 py-0.5 font-medium shrink-0 select-none">
        main
      </span>
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={(cat) => mutations.setPeriodCategory.mutate({ date, periodId, category: cat })}
        compact
        categoryDescriptions={categoryDescriptions}
      />
      <Tooltip content="Changing the category here applies to this work period only, not your global auto-category setting.">
        <span
          aria-label="This change applies to this work period only"
          className="text-gray-400 dark:text-gray-500 cursor-help select-none text-xs"
        >
          ⓘ
        </span>
      </Tooltip>
    </div>
  )
}

// ─── Period Card ──────────────────────────────────────────────────────────────

interface PeriodCardProps {
  w: WorkPeriod
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
  nowTime: string
}

function PeriodCard({ w, date, categories, mutations, categoryDescriptions, nowTime }: PeriodCardProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  const isRunning = w.end === null
  const liveSubtask = w.subtasks.find(isLiveSubtask)
  const completedSubtasks = w.subtasks.filter((s) => !isLiveSubtask(s))

  const duration = calculateWorkedHours([w], isRunning ? nowTime : undefined)
  const slicedHours = completedSubtasks.reduce((s, sl) => s + sl.hours, 0)
  const remainder = Math.max(0, duration - slicedHours)
  const overbooked = !isRunning && slicedHours > duration + 0.001

  const liveElapsedHours = (() => {
    if (!liveSubtask) return 0
    let startMins = minutesFrom(liveSubtask.startedAt)
    let endMins = minutesFrom(nowTime)
    if (endMins < startMins) endMins += 24 * 60
    return (endMins - startMins) / 60
  })()
  const displayRemainder = Math.max(0, remainder - liveElapsedHours)

  return (
    <div className="rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
      <CardHeader
        w={w}
        date={date}
        duration={duration}
        isRunning={isRunning}
        liveSubtask={liveSubtask}
        mutations={mutations}
      />

      <div className="px-4 py-3 flex flex-col gap-1.5">
        {liveSubtask && (
          <LiveSubtaskBanner
            subtask={liveSubtask}
            periodId={w.id}
            date={date}
            nowTime={nowTime}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
          />
        )}

        <AutoCategoryRow
          hours={displayRemainder}
          isRunning={isRunning}
          hasLiveSubtask={!!liveSubtask}
          category={w.category}
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          periodId={w.id}
          date={date}
          mutations={mutations}
          index={0}
        />

        {completedSubtasks.map((sl, i) => (
          <SubtaskRow
            key={sl.id}
            sl={sl}
            index={i + 1}
            periodId={w.id}
            date={date}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
          />
        ))}

        {overbooked && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Subtasks exceed period by {formatHours(slicedHours - duration, timeFormat)} — reduce subtask hours or extend
            the period.
          </p>
        )}

        <PeriodCardFooter
          isRunning={isRunning}
          periodId={w.id}
          date={date}
          categories={categories}
          defaultCategory={w.category}
          mutations={mutations}
          categoryDescriptions={categoryDescriptions}
        />
      </div>
    </div>
  )
}

// ─── WorkOverview ──────────────────────────────────────────────────────────

export function WorkOverview({
  date,
  windows,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  categoryDescriptions,
}: Props) {
  const mutations = useWorkPeriodMutations(repository)
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const openPeriod = findOpenPeriod(windows) ?? null
  const categories = getAllCategories(customCategories, categoryOrder)
  const defaultCategory = autoCategory ?? UNCATEGORIZED_CATEGORY
  const nowTime = useNow()

  function handleAdd(incoming: WorkPeriod) {
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    mutations.saveWithAbsorbed.mutate({ date, window: merged, absorbed })
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No periods recorded yet</p>
      ) : (
        sorted.map((w) => (
          <PeriodCard
            key={w.id}
            w={w}
            date={date}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
            nowTime={nowTime}
          />
        ))
      )}
      <AddPeriodForm
        openPeriod={openPeriod}
        defaultCategory={defaultCategory}
        categories={categories}
        onAdd={handleAdd}
      />
    </div>
  )
}
