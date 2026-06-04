import { useState, useRef, useEffect } from 'react'
import type { WorkPeriod, WorkPeriodSlice, MonthRepository } from '../repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'
import { calculateWorkedHours, calcSliceHours } from '../domain/worktime'
import { getAllCategories } from '../domain/categories'
import { useTimeFormatStore } from '../stores/timeFormatStore'
import { formatHours } from '../domain/formatHours'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[]
  categoryOrder?: string[]
  categoryDescriptions?: Record<string, string>
}

type LiveSlice = WorkPeriodSlice & { startedAt: string; stoppedAt?: undefined }
type TimedSlice = WorkPeriodSlice & { startedAt: string; stoppedAt: string }

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

function isLiveSlice(s: WorkPeriodSlice): s is LiveSlice {
  return !!s.startedAt && !s.stoppedAt
}

function isTimedSlice(s: WorkPeriodSlice): s is TimedSlice {
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
  categoryDescriptions?: Record<string, string>
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
          {categoryDescriptions?.[c] ? `${c} — ${categoryDescriptions[c]}` : c}
        </option>
      ))}
    </select>
  )
}

// ─── Stop Slice Form ──────────────────────────────────────────────────────────

interface StopSliceFormProps {
  sliceStartedAt: string
  onStop: (stoppedAt: string) => void
  onCancel: () => void
}

function StopSliceForm({ sliceStartedAt, onStop, onCancel }: StopSliceFormProps) {
  const [stoppedAt, setStoppedAt] = useState(nowHHMM)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleStop() {
    if (!stoppedAt || !isAfter(stoppedAt, sliceStartedAt)) {
      setError(true)
      return
    }
    onStop(stoppedAt)
  }

  return (
    <div className="flex items-center gap-2 pl-4 flex-wrap">
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
        aria-label="Slice stopped at"
        className={`rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">Must be after {sliceStartedAt}</span>}
      <button
        onClick={handleStop}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Save
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

// ─── Stop Period Form ─────────────────────────────────────────────────────────

interface StopPeriodFormProps {
  periodStart: string
  liveSlice: LiveSlice | undefined
  onStop: (stopTime: string) => void
  onCancel: () => void
}

function StopPeriodForm({ periodStart, liveSlice, onStop, onCancel }: StopPeriodFormProps) {
  const [stopTime, setStopTime] = useState(nowHHMM)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleStop() {
    const baseTime = liveSlice && isAfter(liveSlice.startedAt, periodStart) ? liveSlice.startedAt : periodStart
    if (!stopTime || !isAfter(stopTime, baseTime)) {
      setError(true)
      return
    }
    onStop(stopTime)
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
        className={`rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">Must be after {periodStart}</span>}
      <button
        onClick={handleStop}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Save
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

// ─── Live Slice Banner ────────────────────────────────────────────────────────

interface LiveSliceBannerProps {
  slice: LiveSlice
  periodId: string
  date: string
  nowTime: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string>
}

function LiveSliceBanner({
  slice,
  periodId,
  date,
  nowTime,
  categories,
  mutations,
  categoryDescriptions,
}: LiveSliceBannerProps) {
  const [stopping, setStopping] = useState(false)
  const [editingCategory, setEditingCategory] = useState(false)
  const elapsed = elapsedDisplay(slice.startedAt, nowTime)
  const description = categoryDescriptions?.[slice.category]

  function changeCategory(cat: string) {
    mutations.addSlice.mutate({ date, periodId, slice: { ...slice, category: cat } })
    setEditingCategory(false)
  }

  return (
    <div data-testid="live-slice-banner" className="flex flex-col gap-1 mb-2 pb-2 border-b dark:border-gray-700">
      <div className="flex items-start gap-2 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0 mt-[3px]" />
        <span className="flex-1 leading-tight">
          {editingCategory ? (
            <CategoryPicker
              value={slice.category}
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
              <span className="block">{slice.category}</span>
              {description && (
                <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">{description}</span>
              )}
            </button>
          )}
        </span>
        <span className="font-mono text-sm text-green-600 dark:text-green-400 font-semibold tabular-nums">
          {elapsed}
        </span>
        {!stopping && (
          <button
            onClick={() => setStopping(true)}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium shrink-0"
          >
            Stop slice
          </button>
        )}
      </div>
      {stopping && (
        <StopSliceForm
          sliceStartedAt={slice.startedAt}
          onStop={(stoppedAt) => {
            mutations.stopLiveSlice.mutate({ date, periodId, sliceId: slice.id, stoppedAt })
            setStopping(false)
          }}
          onCancel={() => setStopping(false)}
        />
      )}
    </div>
  )
}

// ─── Start Slice Form ─────────────────────────────────────────────────────────

interface StartSliceFormProps {
  categories: string[]
  defaultCategory: string
  onStart: (slice: LiveSlice) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string>
}

function StartSliceForm({ categories, defaultCategory, onStart, onCancel, categoryDescriptions }: StartSliceFormProps) {
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
        aria-label="Slice started at"
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

// ─── Slice Row (display + inline edit) ────────────────────────────────────────

interface SliceRowProps {
  sl: WorkPeriodSlice
  index: number
  periodId: string
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string>
}

function resolveSliceEdit(
  sl: WorkPeriodSlice,
  category: string,
  note: string | undefined,
  start: string,
  end: string,
  hoursRaw: string,
  submode: 'timed' | 'decimal',
): { slice: WorkPeriodSlice; valid: boolean } {
  if (submode === 'timed') {
    const h = calcSliceHours(start, end)
    if (!h || h <= 0) return { slice: sl, valid: false }
    return { slice: { ...sl, category, hours: h, startedAt: start, stoppedAt: end, note }, valid: true }
  }
  const h = parseDurationInput(hoursRaw)
  if (!h || h <= 0) return { slice: sl, valid: false }
  return { slice: { ...sl, category, hours: h, startedAt: undefined, stoppedAt: undefined, note }, valid: true }
}

interface SliceEditFormProps {
  sl: WorkPeriodSlice
  periodId: string
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string>
  stripeBg: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  onDone: () => void
}

function SliceEditForm({
  sl,
  periodId,
  date,
  categories,
  categoryDescriptions,
  stripeBg,
  mutations,
  onDone,
}: SliceEditFormProps) {
  const timed = isTimedSlice(sl)
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
    const { slice, valid } = resolveSliceEdit(
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
    mutations.addSlice.mutate({ date, periodId, slice })
    onDone()
  }

  function switchToDecimal() {
    setEditHours(String(Math.round(calcSliceHours(editStart, editEnd) * 100) / 100))
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
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 self-start mt-[3px]" />
        <CategoryPicker
          value={editCategory}
          categories={categories}
          onChange={setEditCategory}
          compact
          categoryDescriptions={categoryDescriptions}
        />
        {timed && submode === 'timed' ? (
          <>
            <input
              type="text"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              onKeyDown={kd}
              aria-label="Slice start time"
              className={`${inputClass} w-16`}
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="text"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              onKeyDown={kd}
              aria-label="Slice end time"
              ref={endInputRef}
              className={`${inputClass} w-16`}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {formatHours(calcSliceHours(editStart, editEnd), timeFormat)}
            </span>
          </>
        ) : (
          <input
            type="text"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            onKeyDown={kd}
            aria-label="Slice hours"
            ref={hoursInputRef}
            className={`${inputClass} w-20`}
          />
        )}
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
          aria-label="Slice note"
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

function SliceRow({ sl, index, periodId, date, categories, mutations, categoryDescriptions }: SliceRowProps) {
  const [editing, setEditing] = useState(false)
  const timed = isTimedSlice(sl)
  const stripeBg = index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50 rounded -mx-2 px-2' : ''
  const timeFormat = useTimeFormatStore((s) => s.format)
  const categoryDescription = categoryDescriptions?.[sl.category]

  if (editing) {
    return (
      <SliceEditForm
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
    <div data-testid="slice-row" className={`flex items-center gap-2 text-sm group/slice py-0.5 ${stripeBg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 self-start mt-[3px]" />
      <button
        onClick={() => setEditing(true)}
        className="font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left leading-tight"
        aria-label={`Edit ${sl.category} slice`}
      >
        <span className="block">{sl.category}</span>
        {categoryDescription && (
          <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">{categoryDescription}</span>
        )}
        {sl.note && (
          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 italic">{sl.note}</span>
        )}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-400 dark:text-gray-500 text-xs hover:text-indigo-600 dark:hover:text-indigo-400 self-start mt-0.5 text-right"
        aria-label={`Edit ${sl.category} hours`}
      >
        <span className="block">{formatHours(sl.hours, timeFormat)}</span>
        {timed && (
          <span className="block text-gray-300 dark:text-gray-600">
            {sl.startedAt}–{sl.stoppedAt}
          </span>
        )}
      </button>
      <button
        onClick={() => mutations.deleteSlice.mutate({ date, periodId, sliceId: sl.id })}
        className="ml-auto text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-base leading-none self-start"
        aria-label={`Remove ${sl.category} slice`}
      >
        ×
      </button>
    </div>
  )
}

// ─── Add Slice Form (fixed duration) ─────────────────────────────────────────

interface SliceFormProps {
  categories: string[]
  onAdd: (slice: WorkPeriodSlice) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string>
}

function SliceForm({ categories, onAdd, onCancel, categoryDescriptions }: SliceFormProps) {
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
          aria-label="Slice duration"
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
        aria-label="Slice note"
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
  categoryDescriptions?: Record<string, string>
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
  const [addingSlice, setAddingSlice] = useState(false)
  const [startingSlice, setStartingSlice] = useState(false)

  if (startingSlice) {
    return (
      <StartSliceForm
        categories={categories}
        defaultCategory={defaultCategory}
        categoryDescriptions={categoryDescriptions}
        onStart={(slice) => {
          mutations.startLiveSlice.mutate({ date, periodId, slice })
          setStartingSlice(false)
        }}
        onCancel={() => setStartingSlice(false)}
      />
    )
  }

  if (addingSlice) {
    return (
      <SliceForm
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        onAdd={(sl) => {
          mutations.addSlice.mutate({ date, periodId, slice: sl })
          setAddingSlice(false)
        }}
        onCancel={() => setAddingSlice(false)}
      />
    )
  }

  return (
    <div className="flex items-center gap-3 mt-0.5">
      {isRunning && (
        <button
          onClick={() => setStartingSlice(true)}
          title="Start a live timer for a category within this period"
          className="text-xs text-green-600 dark:text-green-500 hover:text-green-800 dark:hover:text-green-300 font-medium"
        >
          ▶ Live timer
        </button>
      )}
      <button
        onClick={() => setAddingSlice(true)}
        title="Record a completed time block within this period"
        className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
      >
        + Log time
      </button>
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
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [category, setCategory] = useState(defaultCategory)

  const isLive = !draftEnd
  const canSubmit = !isLive || !openPeriod

  function handleAdd() {
    if (!canSubmit) return
    const start = draftStart || nowHHMM()
    onAdd({ id: crypto.randomUUID(), start, end: draftEnd || null, category, slices: [] })
    setDraftStart('')
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

function headerBg(overbooked: boolean, uncategorized: boolean, isRunning: boolean): string {
  if (overbooked) return 'bg-red-50 dark:bg-red-900/20'
  if (uncategorized) return 'bg-amber-50 dark:bg-amber-900/20'
  if (isRunning) return 'bg-green-50 dark:bg-green-900/20'
  return 'bg-gray-50 dark:bg-gray-800/60'
}

interface CardHeaderProps {
  w: WorkPeriod
  date: string
  duration: number
  slicedHours: number
  overbooked: boolean
  uncategorized: boolean
  isRunning: boolean
  liveSlice: LiveSlice | undefined
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string>
}

function CardHeader({
  w,
  date,
  duration,
  slicedHours,
  overbooked,
  uncategorized,
  isRunning,
  liveSlice,
  categories,
  mutations,
  categoryDescriptions,
}: CardHeaderProps) {
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
    <div className={`px-4 py-3 ${headerBg(overbooked, uncategorized, isRunning)}`}>
      <div className="flex items-center justify-between">
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
              {w.start} – {w.end ?? '…'}
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
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 border dark:border-gray-600 shrink-0">
            {formatHours(duration, timeFormat)}
          </span>
          {overbooked && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full px-2 py-0.5 shrink-0">
              +{formatHours(slicedHours - duration, timeFormat)} over
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CategoryPicker
            value={w.category}
            categories={categories}
            onChange={(cat) => mutations.setPeriodCategory.mutate({ date, periodId: w.id, category: cat })}
            compact
            categoryDescriptions={categoryDescriptions}
          />
          {showStopButton && (
            <button
              onClick={() => setStoppingPeriod(true)}
              aria-label="Stop tracking"
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5"
            >
              Stop
            </button>
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
      {stoppingPeriod && (
        <StopPeriodForm
          periodStart={w.start}
          liveSlice={liveSlice}
          onStop={(stopTime) => {
            mutations.stopPeriod.mutate({
              date,
              periodId: w.id,
              endTime: stopTime,
              liveSliceId: liveSlice?.id,
              stoppedAt: liveSlice ? stopTime : undefined,
            })
            setStoppingPeriod(false)
          }}
          onCancel={() => setStoppingPeriod(false)}
        />
      )}
    </div>
  )
}

// ─── Remainder Row ────────────────────────────────────────────────────────────

function RemainderRow({
  remainder,
  uncategorized,
  category,
  categoryDescriptions,
}: {
  remainder: number
  uncategorized: boolean
  category: string
  categoryDescriptions?: Record<string, string>
}) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const dotClass = uncategorized ? 'bg-amber-400' : 'bg-emerald-400 dark:bg-emerald-500'
  const labelClass = uncategorized ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
  const description = uncategorized ? undefined : categoryDescriptions?.[category]
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[3px] ${dotClass}`} />
      <span className={`font-medium leading-tight ${labelClass}`}>
        <span className="block">{uncategorized ? 'Uncategorized' : category}</span>
        {description && (
          <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">{description}</span>
        )}
      </span>
      <span className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{formatHours(remainder, timeFormat)}</span>
    </div>
  )
}

// ─── Period Card ──────────────────────────────────────────────────────────────

interface PeriodCardProps {
  w: WorkPeriod
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string>
  nowTime: string
}

function PeriodCard({ w, date, categories, mutations, categoryDescriptions, nowTime }: PeriodCardProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  const isRunning = w.end === null
  const liveSlice = w.slices.find(isLiveSlice)
  const completedSlices = w.slices.filter((s) => !isLiveSlice(s))

  const duration = calculateWorkedHours([w], isRunning ? nowTime : undefined)
  const slicedHours = completedSlices.reduce((s, sl) => s + sl.hours, 0)
  const remainder = isRunning ? null : Math.max(0, duration - slicedHours)
  const overbooked = !isRunning && slicedHours > duration + 0.001
  const uncategorized = w.category === UNCATEGORIZED_CATEGORY && (remainder ?? 0) > 0.001

  return (
    <div className="rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
      <CardHeader
        w={w}
        date={date}
        duration={duration}
        slicedHours={slicedHours}
        overbooked={overbooked}
        uncategorized={uncategorized}
        isRunning={isRunning}
        liveSlice={liveSlice}
        categories={categories}
        mutations={mutations}
        categoryDescriptions={categoryDescriptions}
      />

      <div className="px-4 py-3 flex flex-col gap-1.5">
        {liveSlice && (
          <LiveSliceBanner
            slice={liveSlice}
            periodId={w.id}
            date={date}
            nowTime={nowTime}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
          />
        )}

        {completedSlices.map((sl, i) => (
          <SliceRow
            key={sl.id}
            sl={sl}
            index={i}
            periodId={w.id}
            date={date}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
          />
        ))}

        {remainder !== null && remainder > 0.001 && (
          <RemainderRow
            remainder={remainder}
            uncategorized={uncategorized}
            category={w.category}
            categoryDescriptions={categoryDescriptions}
          />
        )}

        {overbooked && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Slices exceed period by {formatHours(slicedHours - duration, timeFormat)} — reduce slice hours or extend the
            period.
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

// ─── WorkPeriodPanel ──────────────────────────────────────────────────────────

export function WorkPeriodPanel({
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
  const openPeriod = windows.find((w) => w.end === null) ?? null
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
