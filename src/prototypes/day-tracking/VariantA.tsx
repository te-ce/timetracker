// PROTOTYPE — Variant A "Hero Timer": one dominant now-panel, one-click stop,
// history collapsed into dense single lines.
import { useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { elapsedHours, nowHHMM } from '../../shared/worktime'
import { isLiveSubtask } from '../../features/day/workPeriodShared'
import {
  categoryLabel,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type VariantProps,
} from './protoShared'

function CategorySelect({
  value,
  categories,
  onChange,
  className,
}: {
  value: string
  categories: string[]
  onChange: (c: string) => void
  className?: string
}) {
  return (
    <select
      aria-label="Category"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${className ?? ''}`}
    >
      {optionsFor(value, categories).map((c) => (
        <option key={c} value={c}>
          {categoryLabel(c)}
        </option>
      ))}
    </select>
  )
}

export function VariantA({
  date,
  windows,
  repository,
  categories,
  defaultCategory,
  nowTime,
  categoryDescriptions,
}: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [idleCategory, setIdleCategory] = useState(defaultCategory)
  const [stopAt, setStopAt] = useState<string | null>(null)
  const [addingPast, setAddingPast] = useState(false)
  const [pastStart, setPastStart] = useState('')
  const [pastEnd, setPastEnd] = useState('')
  const [pastCategory, setPastCategory] = useState(defaultCategory)
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const running = windows.find((w) => w.end === null)
  const closed = sortedPeriods(windows).filter((w) => w.end !== null)
  const total = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)
  const liveSubtask = running?.subtasks.find(isLiveSubtask)

  return (
    <div className="flex flex-col gap-5">
      {running ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-5xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatHours(periodDuration(running, nowTime), timeFormat)}
                </span>
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-emerald-800/80 dark:text-emerald-200/70">
                <span className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                  {categoryLabel(running.category)}
                </span>
                {categoryDescriptions?.[running.category] && <span>({categoryDescriptions[running.category]})</span>}
                <span>· since {running.start}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => actions.stop(running)}
              className="rounded-xl bg-red-600 px-10 py-4 text-lg font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Stop
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-emerald-200 pt-4 text-sm dark:border-emerald-800/60">
            {stopAt === null ? (
              <button
                type="button"
                onClick={() => setStopAt(nowHHMM())}
                className="text-emerald-800 underline decoration-dotted hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
              >
                Stop at a different time…
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label="Stop time"
                  value={stopAt}
                  onChange={(e) => setStopAt(e.target.value)}
                  className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    actions.stop(running, stopAt)
                    setStopAt(null)
                  }}
                  className="font-medium text-red-600 dark:text-red-400"
                >
                  Stop
                </button>
                <button type="button" onClick={() => setStopAt(null)} className="text-gray-500">
                  Cancel
                </button>
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="text-emerald-800/70 dark:text-emerald-200/60">Category</span>
              <CategorySelect
                value={running.category}
                categories={categories}
                onChange={(c) => actions.setCategory(running.id, c)}
              />
            </span>
            {liveSubtask ? (
              <span className="ml-auto flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <span className="font-medium text-amber-900 dark:text-amber-200">
                  {categoryLabel(liveSubtask.category)}
                </span>
                <span className="font-mono tabular-nums text-amber-800 dark:text-amber-300">
                  {formatHours(elapsedHours(liveSubtask.startedAt, nowTime, { raceToleranceMinutes: 5 }), timeFormat)}
                </span>
                <button
                  type="button"
                  onClick={() => actions.stopSubtaskNow(running.id, liveSubtask.id)}
                  className="font-medium text-amber-700 underline dark:text-amber-300"
                >
                  Stop subtask
                </button>
              </span>
            ) : subtaskFor === running.id ? (
              <span className="ml-auto flex items-center gap-2">
                <CategorySelect
                  value={idleCategory}
                  categories={categories}
                  onChange={(c) => {
                    actions.startSubtaskNow(running.id, c)
                    setSubtaskFor(null)
                  }}
                />
                <button type="button" onClick={() => setSubtaskFor(null)} className="text-gray-500">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSubtaskFor(running.id)}
                className="ml-auto text-emerald-800 underline decoration-dotted dark:text-emerald-300"
              >
                + Subtask
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Not tracking</p>
              <div className="mt-2 flex items-center gap-2">
                <CategorySelect
                  value={idleCategory}
                  categories={categories}
                  onChange={setIdleCategory}
                  className="!px-3 !py-2 !text-base"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => actions.startNow(idleCategory)}
              className="rounded-xl bg-emerald-600 px-10 py-4 text-lg font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              ▶ Start now
            </button>
          </div>
          <div className="mt-4 border-t pt-4 text-sm dark:border-gray-700">
            {addingPast ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  aria-label="Past start"
                  value={pastStart}
                  onChange={(e) => setPastStart(e.target.value)}
                  className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  aria-label="Past end"
                  value={pastEnd}
                  onChange={(e) => setPastEnd(e.target.value)}
                  className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <CategorySelect value={pastCategory} categories={categories} onChange={setPastCategory} />
                <button
                  type="button"
                  disabled={!pastStart || !pastEnd}
                  onClick={() => {
                    actions.addPeriod(pastStart, pastEnd, pastCategory)
                    setPastStart('')
                    setPastEnd('')
                    setAddingPast(false)
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
                <button type="button" onClick={() => setAddingPast(false)} className="text-gray-500">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingPast(true)}
                className="text-gray-500 underline decoration-dotted hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                + Log a period that already happened
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Earlier today
          </h3>
          <span className="font-mono text-sm tabular-nums text-gray-500 dark:text-gray-400">
            {formatHours(total, timeFormat)} total
          </span>
        </div>
        {closed.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Nothing logged yet</p>
        ) : (
          <ul className="divide-y dark:divide-gray-700/70">
            {closed.map((w) => (
              <HistoryRow
                key={w.id}
                w={w}
                nowTime={nowTime}
                categories={categories}
                editing={editing === w.id}
                onEdit={() => setEditing(w.id)}
                onDone={() => setEditing(null)}
                onSave={(start, end) => {
                  actions.setTimes(w, start, end)
                  setEditing(null)
                }}
                onCategory={(c) => actions.setCategory(w.id, c)}
                onDelete={() => {
                  actions.remove(w.id)
                  setEditing(null)
                }}
                onRemoveSubtask={(subtaskId) => actions.removeSubtask(w.id, subtaskId)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface HistoryRowProps {
  w: WorkPeriod
  nowTime: string
  categories: string[]
  editing: boolean
  onEdit: () => void
  onDone: () => void
  onSave: (start: string, end: string | null) => void
  onCategory: (c: string) => void
  onDelete: () => void
  onRemoveSubtask: (subtaskId: string) => void
}

function HistoryRow({
  w,
  nowTime,
  categories,
  editing,
  onEdit,
  onDone,
  onSave,
  onCategory,
  onDelete,
  onRemoveSubtask,
}: HistoryRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [start, setStart] = useState(w.start)
  const [end, setEnd] = useState(w.end ?? '')

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 bg-indigo-50/60 py-2 dark:bg-indigo-950/30">
        <input
          type="time"
          aria-label="Edit start time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <span className="text-gray-400">–</span>
        <input
          type="time"
          aria-label="Edit end time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <CategorySelect value={w.category} categories={categories} onChange={onCategory} />
        <button
          type="button"
          onClick={() => onSave(start, end || null)}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
        >
          Save
        </button>
        <button type="button" onClick={onDone} className="text-sm text-gray-500">
          Cancel
        </button>
        <button type="button" onClick={onDelete} className="ml-auto text-sm text-red-600 dark:text-red-400">
          Delete
        </button>
      </li>
    )
  }

  return (
    <li className="group">
      <div className="flex items-center gap-3 py-1.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit period ${w.start} to ${w.end ?? 'open'}`}
          className="flex flex-1 items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="font-mono text-sm tabular-nums text-gray-400 dark:text-gray-500">
            {w.start}–{w.end}
          </span>
          <span className="w-14 text-right font-mono text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {formatHours(periodDuration(w, nowTime), timeFormat)}
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{categoryLabel(w.category)}</span>
        </button>
      </div>
      {w.subtasks.length > 0 && (
        <ul className="mb-1 ml-6 flex flex-col gap-0.5">
          {w.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span aria-hidden="true">↳</span>
              <span className="font-mono tabular-nums">{formatHours(s.hours, timeFormat)}</span>
              <span>{categoryLabel(s.category)}</span>
              {s.note && <span className="italic">{s.note}</span>}
              <button
                type="button"
                onClick={() => onRemoveSubtask(s.id)}
                aria-label={`Remove ${s.category} subtask`}
                className="opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
