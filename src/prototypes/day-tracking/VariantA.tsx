// PROTOTYPE — Variant A "Live Chronology": one chronological ledger. The running
// work sits at the bottom of the same list as everything before it (no hero
// banner), every subtask is always visible, and the day's totals sit on top.
import { useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { LogSubtaskForm } from './LogSubtaskForm'
import {
  categoryLabel,
  categoryTotals,
  deriveSegments,
  findActiveTracking,
  findGaps,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type ProtoActions,
  type VariantProps,
} from './protoShared'

const BAR_COLORS = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-violet-500']

function colorFor(category: string): string {
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return BAR_COLORS[hash % BAR_COLORS.length] ?? 'bg-gray-500'
}

export function VariantA({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [startCategory, setStartCategory] = useState(defaultCategory)

  const periods = sortedPeriods(windows)
  const active = findActiveTracking(windows, nowTime)
  const totals = [...categoryTotals(windows, nowTime).entries()]
    .filter(([, h]) => h > 0.001)
    .toSorted((a, b) => b[1] - a[1])
  const dayTotal = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)
  const gapAfter = new Map(findGaps(windows).map((g) => [g.start, g]))

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border px-4 py-3 dark:border-gray-700">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-semibold tabular-nums text-gray-800 dark:text-gray-100">
            {formatHours(dayTotal, timeFormat)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {active ? (
              <>
                tracking{' '}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {categoryLabel(active.category)}
                </span>{' '}
                since {active.since}
              </>
            ) : (
              'not tracking'
            )}
          </span>
        </div>
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {totals.map(([category, h]) => (
            <span
              key={category}
              className={colorFor(category)}
              style={{ width: `${(h / Math.max(dayTotal, 0.01)) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {totals.map(([category, h]) => (
            <li key={category} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${colorFor(category)}`} />
              <span className="text-gray-600 dark:text-gray-300">{categoryLabel(category)}</span>
              <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                {formatHours(h, timeFormat)}
              </span>
            </li>
          ))}
          {totals.length === 0 && <li className="text-gray-400 dark:text-gray-500">nothing tracked yet</li>}
        </ul>
      </div>

      <ol className="flex flex-col gap-2">
        {periods.map((w) => (
          <li key={w.id} className="flex flex-col gap-1">
            <PeriodGroup
              key={`${w.id}:${w.start}:${w.end ?? ''}`}
              w={w}
              nowTime={nowTime}
              categories={categories}
              actions={actions}
              activeSubtaskId={active?.subtask?.id}
            />
            {w.end && gapAfter.has(w.end) && (
              <div className="flex items-center gap-2 pl-14 text-xs text-gray-400 dark:text-gray-500">
                <span className="h-px w-6 border-t border-dashed border-gray-300 dark:border-gray-600" />
                <span>
                  gap {formatHours(gapAfter.get(w.end)?.hours ?? 0, timeFormat)} · {w.end}–{gapAfter.get(w.end)?.end}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const gap = gapAfter.get(w.end ?? '')
                    if (gap) actions.addPeriod(gap.start, gap.end, defaultCategory)
                  }}
                  className="underline decoration-dotted hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  fill
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {active ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          One thing is tracked at a time — stop {categoryLabel(active.category)} to start something else.
        </p>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">Next up</span>
          <select
            aria-label="Category to start"
            value={startCategory}
            onChange={(e) => setStartCategory(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {optionsFor(startCategory, categories).map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => actions.startNow(startCategory)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ▶ Start at {nowTime}
          </button>
        </div>
      )}
    </div>
  )
}

interface PeriodGroupProps {
  w: WorkPeriod
  nowTime: string
  categories: string[]
  actions: ProtoActions
  activeSubtaskId: string | undefined
}

function PeriodGroup({ w, nowTime, categories, actions, activeSubtaskId }: PeriodGroupProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [editingTimes, setEditingTimes] = useState(false)
  const [start, setStart] = useState(w.start)
  const [end, setEnd] = useState(w.end ?? '')
  const isRunning = w.end === null
  const segments = deriveSegments(w, nowTime)
  const canStartSubtask = isRunning && !activeSubtaskId

  return (
    <div
      className={`rounded-xl border ${
        isRunning
          ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20'
          : 'dark:border-gray-700'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        {editingTimes ? (
          <span className="flex items-center gap-1">
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
              onClick={() => {
                actions.setTimes(w, start, end || null)
                setEditingTimes(false)
              }}
              className="ml-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditingTimes(false)} className="ml-1 text-xs text-gray-500">
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTimes(true)}
            aria-label={`Edit times ${w.start} to ${w.end ?? 'open'}`}
            className="font-mono text-sm font-semibold tabular-nums text-gray-700 hover:text-indigo-600 dark:text-gray-200 dark:hover:text-indigo-400"
          >
            {w.start} – {w.end ?? 'now'}
          </button>
        )}
        <span className="font-mono text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
          {formatHours(periodDuration(w, nowTime), timeFormat)}
        </span>
        <select
          aria-label={`Main category of period starting ${w.start}`}
          value={w.category}
          onChange={(e) => actions.setCategory(w.id, e.target.value)}
          className="rounded border-transparent bg-transparent py-0.5 text-sm font-medium text-gray-800 hover:border-gray-300 dark:text-gray-100 dark:hover:border-gray-600"
        >
          {optionsFor(w.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-2">
          {isRunning && (
            <button
              type="button"
              onClick={() => actions.stop(w)}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              ■ Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => actions.remove(w.id)}
            aria-label={`Delete period starting ${w.start}`}
            className="px-1 text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        </span>
      </div>

      <ul className="border-t px-3 py-1.5 dark:border-gray-700/70">
        {segments.map((seg) => (
          <li
            key={seg.key}
            className={`flex items-center gap-3 rounded py-1 text-sm ${
              seg.live ? 'bg-emerald-100/70 px-2 dark:bg-emerald-900/30' : ''
            }`}
          >
            <span className="flex w-16 shrink-0 items-center justify-end gap-1">
              {seg.live && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
              <span
                className={`font-mono text-sm tabular-nums ${
                  seg.live ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {formatHours(seg.hours, timeFormat)}
              </span>
            </span>
            <span
              className={`truncate ${seg.kind === 'main' ? 'text-gray-700 dark:text-gray-300' : 'font-medium text-gray-800 dark:text-gray-100'}`}
            >
              {seg.kind === 'subtask' && <span className="mr-1 text-gray-300 dark:text-gray-600">↳</span>}
              {categoryLabel(seg.category)}
            </span>
            <span className="font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
              {seg.placed ? `${seg.start}–${seg.end ?? 'now'}` : 'untracked'}
            </span>
            {seg.note && <span className="truncate text-xs italic text-gray-400 dark:text-gray-500">{seg.note}</span>}
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {seg.live && seg.kind === 'subtask' && seg.subtask && (
                <button
                  type="button"
                  onClick={() => actions.stopSubtaskNow(w.id, seg.subtask?.id ?? '')}
                  className="rounded border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                >
                  Stop subtask
                </button>
              )}
              {seg.kind === 'subtask' && seg.subtask && !seg.live && (
                <button
                  type="button"
                  onClick={() => actions.removeSubtask(w.id, seg.subtask?.id ?? '')}
                  aria-label={`Remove ${seg.category} subtask`}
                  className="px-1 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-4 border-t px-3 py-1.5 dark:border-gray-700/70">
        {canStartSubtask && (
          <button
            type="button"
            onClick={() => actions.startSubtaskNow(w.id, w.category)}
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
          >
            ▶ start subtask now (pauses {categoryLabel(w.category)})
          </button>
        )}
        <LogSubtaskForm
          categories={categories}
          defaultCategory={w.category}
          onLog={(category, hours) => actions.logSubtask(w.id, category, hours)}
        />
      </div>
    </div>
  )
}
