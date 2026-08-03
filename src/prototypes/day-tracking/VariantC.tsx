// PROTOTYPE — Variant C "Category Tiles": tracking is a single tap on a
// category. Tapping another category chains (stop now + start now), so the
// common path has no forms and no time inputs at all.
import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { elapsedHours } from '../../shared/worktime'
import { isLiveSubtask } from '../../features/day/workPeriodShared'
import {
  categoryLabel,
  categoryTotals,
  isUncategorized,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type VariantProps,
} from './protoShared'

export function VariantC({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [manual, setManual] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [manualCategory, setManualCategory] = useState(defaultCategory)
  const [editingId, setEditingId] = useState<string | null>(null)

  const running = windows.find((w) => w.end === null)
  const totals = categoryTotals(windows, nowTime)
  const dayTotal = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)
  const maxTotal = Math.max(0.01, ...totals.values())
  const log = sortedPeriods(windows)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {running ? `Tracking ${categoryLabel(running.category)}` : 'Tap a category to start'}
          </h3>
          {running && (
            <button
              type="button"
              onClick={() => actions.stop(running)}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              ■ Stop
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {categories
            .filter((c) => !isUncategorized(c))
            .map((c) => {
              const active = running?.category === c ? running : undefined
              const isActive = !!active
              const total = totals.get(c) ?? 0
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => (active ? actions.stop(active) : actions.switchTo(c))}
                  aria-pressed={isActive}
                  className={`flex h-24 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 dark:bg-emerald-950/50'
                      : 'hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-gray-700 dark:hover:bg-indigo-950/30'
                  }`}
                >
                  <span className="flex w-full items-center gap-1.5">
                    {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {categoryLabel(c)}
                    </span>
                  </span>
                  <span className="flex w-full items-end justify-between">
                    <span
                      className={`font-mono text-xl tabular-nums ${
                        isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {total > 0 ? formatHours(total, timeFormat) : '–'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {isActive ? 'tap to stop' : running ? 'switch' : 'start'}
                    </span>
                  </span>
                </button>
              )
            })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Today · {formatHours(dayTotal, timeFormat)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {[...totals.entries()]
              .filter(([, h]) => h > 0.001)
              .toSorted((a, b) => b[1] - a[1])
              .map(([category, h]) => (
                <li key={category} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate text-gray-700 dark:text-gray-300">
                    {categoryLabel(category)}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: `${(h / maxTotal) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300">
                    {formatHours(h, timeFormat)}
                  </span>
                </li>
              ))}
            {totals.size === 0 && <li className="text-sm text-gray-400 dark:text-gray-500">Nothing tracked yet</li>}
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Log</h3>
            <button
              type="button"
              onClick={() => setManual((v) => !v)}
              className="text-xs text-gray-500 underline decoration-dotted dark:text-gray-400"
            >
              {manual ? 'close' : '+ manual entry'}
            </button>
          </div>
          {manual && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border p-2 dark:border-gray-700">
              <input
                type="time"
                aria-label="Manual start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                aria-label="Manual end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <select
                aria-label="Manual category"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                {optionsFor(manualCategory, categories).map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!start || !end}
                onClick={() => {
                  actions.addPeriod(start, end, manualCategory)
                  setStart('')
                  setEnd('')
                  setManual(false)
                }}
                className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
          <ul className="flex flex-col">
            {log.length === 0 && <li className="text-sm text-gray-400 dark:text-gray-500">Empty</li>}
            {log.map((w) => (
              <li key={w.id} className="border-b py-1.5 last:border-0 dark:border-gray-700/70">
                {editingId === w.id ? (
                  <LogEdit
                    initialStart={w.start}
                    initialEnd={w.end ?? ''}
                    onSave={(s, e) => {
                      actions.setTimes(w, s, e || null)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => {
                      actions.remove(w.id)
                      setEditingId(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(w.id)}
                    aria-label={`Edit period ${w.start} to ${w.end ?? 'open'}`}
                    className="flex w-full items-center gap-2 text-left text-sm"
                  >
                    <span className="font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
                      {w.start}–{w.end ?? '••••'}
                    </span>
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {categoryLabel(w.category)}
                      {w.subtasks.length > 0 && (
                        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                          +{w.subtasks.length} subtask{w.subtasks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {formatHours(periodDuration(w, nowTime), timeFormat)}
                    </span>
                  </button>
                )}
                {w.subtasks.map((s) => (
                  <div key={s.id} className="ml-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span aria-hidden="true">↳</span>
                    <span className="flex-1 truncate">{categoryLabel(s.category)}</span>
                    {isLiveSubtask(s) ? (
                      <>
                        <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {formatHours(elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }), timeFormat)}
                        </span>
                        <button
                          type="button"
                          onClick={() => actions.stopSubtaskNow(w.id, s.id)}
                          className="text-amber-600 dark:text-amber-400"
                        >
                          stop
                        </button>
                      </>
                    ) : (
                      <span className="font-mono tabular-nums">{formatHours(s.hours, timeFormat)}</span>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LogEdit({
  initialStart,
  initialEnd,
  onSave,
  onCancel,
  onDelete,
}: {
  initialStart: string
  initialEnd: string
  onSave: (start: string, end: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
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
      <button
        type="button"
        onClick={() => onSave(start, end)}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
      >
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500">
        Cancel
      </button>
      <button type="button" onClick={onDelete} className="ml-auto text-xs text-red-600 dark:text-red-400">
        Delete
      </button>
    </div>
  )
}
