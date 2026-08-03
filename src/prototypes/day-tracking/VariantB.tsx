// PROTOTYPE — Variant B "Time Grid": the day as a proportional vertical
// timeline. Periods are spatial objects; gaps are visible and fillable; the
// running block grows against a live "now" line.
import { useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { elapsedHours, parseMinutes } from '../../shared/worktime'
import { isLiveSubtask } from '../../features/day/workPeriodShared'
import {
  categoryLabel,
  findGaps,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type VariantProps,
} from './protoShared'

const PX_PER_HOUR = 56

const BLOCK_COLORS = [
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', bar: 'bg-indigo-500', text: 'text-indigo-900 dark:text-indigo-100' },
  { bg: 'bg-sky-100 dark:bg-sky-900/40', bar: 'bg-sky-500', text: 'text-sky-900 dark:text-sky-100' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', bar: 'bg-amber-500', text: 'text-amber-900 dark:text-amber-100' },
  {
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    bar: 'bg-fuchsia-500',
    text: 'text-fuchsia-900 dark:text-fuchsia-100',
  },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', bar: 'bg-teal-500', text: 'text-teal-900 dark:text-teal-100' },
] as const

function colorFor(category: string) {
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return BLOCK_COLORS[hash % BLOCK_COLORS.length] ?? BLOCK_COLORS[0]
}

export function VariantB({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sorted = sortedPeriods(windows)
  const running = windows.find((w) => w.end === null)
  const gaps = findGaps(windows)

  const nowMins = parseMinutes(nowTime)
  const startMins = sorted.length > 0 ? Math.min(...sorted.map((w) => parseMinutes(w.start))) : nowMins - 60
  const endMins = Math.max(nowMins, ...sorted.map((w) => parseMinutes(w.end ?? nowTime)))
  const axisStart = Math.floor(startMins / 60) * 60 - 60
  const axisEnd = Math.ceil(endMins / 60) * 60 + 60
  const hours: number[] = []
  for (let m = axisStart; m <= axisEnd; m += 60) hours.push(m)

  function top(time: string): number {
    return ((parseMinutes(time) - axisStart) / 60) * PX_PER_HOUR
  }
  function height(start: string, end: string): number {
    return Math.max(18, elapsedHours(start, end) * PX_PER_HOUR)
  }

  const selected = sorted.find((w) => w.id === selectedId)

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: `${hours.length * PX_PER_HOUR}px` }}>
          {hours.map((m, i) => (
            <div
              key={m}
              className="absolute left-0 right-0 flex items-start gap-2 border-t border-dashed border-gray-200 dark:border-gray-700/70"
              style={{ top: `${i * PX_PER_HOUR}px` }}
            >
              <span className="-mt-2 w-12 shrink-0 text-right font-mono text-xs text-gray-400 dark:text-gray-500">
                {String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          <div className="absolute bottom-0 left-14 right-0 top-0">
            {gaps.map((gap) => (
              <div
                key={gap.start}
                className="absolute left-0 right-0 flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
                style={{ top: `${top(gap.start)}px`, height: `${height(gap.start, gap.end)}px` }}
              >
                <button
                  type="button"
                  onClick={() => actions.addPeriod(gap.start, gap.end, defaultCategory)}
                  className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-gray-500 hover:text-indigo-600 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:text-indigo-400"
                >
                  + fill {formatHours(gap.hours, timeFormat)} gap
                </button>
              </div>
            ))}

            {sorted.map((w) => {
              const color = colorFor(w.category)
              const isRunning = w.end === null
              const blockHeight = Math.max(isRunning ? 44 : 18, height(w.start, w.end ?? nowTime))
              const live = w.subtasks.find(isLiveSubtask)
              return (
                <div
                  key={w.id}
                  className={`absolute left-0 right-2 overflow-hidden rounded-lg ${color.bg} ${
                    selectedId === w.id ? 'ring-2 ring-indigo-500' : ''
                  } ${isRunning ? 'ring-1 ring-emerald-400' : ''}`}
                  style={{ top: `${top(w.start)}px`, height: `${blockHeight}px` }}
                >
                  <span
                    className={`absolute bottom-0 left-0 top-0 w-1.5 ${isRunning ? 'bg-emerald-500' : color.bar}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    aria-label={`Select period ${w.start} to ${w.end ?? 'open'}`}
                    className="flex h-full w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left"
                  >
                    <span className={`text-sm font-semibold ${color.text}`}>{categoryLabel(w.category)}</span>
                    {blockHeight > 34 && (
                      <span className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-300">
                        {w.start}–{w.end ?? nowTime} · {formatHours(periodDuration(w, nowTime), timeFormat)}
                      </span>
                    )}
                    {blockHeight > 70 && live && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-black/30 dark:text-amber-200">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        {categoryLabel(live.category)}{' '}
                        {formatHours(elapsedHours(live.startedAt, nowTime, { raceToleranceMinutes: 5 }), timeFormat)}
                      </span>
                    )}
                  </button>
                  {isRunning && (
                    <button
                      type="button"
                      onClick={() => actions.stop(w)}
                      className="absolute bottom-1 right-2 rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                    >
                      Stop
                    </button>
                  )}
                </div>
              )
            })}

            <div
              className="pointer-events-none absolute left-0 right-0 flex items-center"
              style={{ top: `${top(nowTime)}px` }}
            >
              <span className="h-px flex-1 bg-red-500/70" />
              <span className="rounded-l bg-red-500 px-1 py-0.5 font-mono text-[10px] text-white">{nowTime}</span>
            </div>
          </div>
        </div>

        {!running && (
          <button
            type="button"
            onClick={() => actions.startNow(defaultCategory)}
            className="mt-3 w-full rounded-lg border border-dashed border-emerald-400 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            ▶ Start tracking at {nowTime}
          </button>
        )}
      </div>

      <aside className="w-64 shrink-0">
        {selected ? (
          <BlockInspector
            key={selected.id}
            w={selected}
            categories={categories}
            nowTime={nowTime}
            onClose={() => setSelectedId(null)}
            onSave={(start, end) => actions.setTimes(selected, start, end)}
            onCategory={(c) => actions.setCategory(selected.id, c)}
            onDelete={() => {
              actions.remove(selected.id)
              setSelectedId(null)
            }}
            onStop={() => actions.stop(selected)}
            onStartSubtask={(c) => actions.startSubtaskNow(selected.id, c)}
            onStopSubtask={(id) => actions.stopSubtaskNow(selected.id, id)}
            onRemoveSubtask={(id) => actions.removeSubtask(selected.id, id)}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Click a block to inspect and edit it.
          </div>
        )}
      </aside>
    </div>
  )
}

interface InspectorProps {
  w: WorkPeriod
  categories: string[]
  nowTime: string
  onClose: () => void
  onSave: (start: string, end: string | null) => void
  onCategory: (c: string) => void
  onDelete: () => void
  onStop: () => void
  onStartSubtask: (category: string) => void
  onStopSubtask: (subtaskId: string) => void
  onRemoveSubtask: (subtaskId: string) => void
}

function BlockInspector({
  w,
  categories,
  nowTime,
  onClose,
  onSave,
  onCategory,
  onDelete,
  onStop,
  onStartSubtask,
  onStopSubtask,
  onRemoveSubtask,
}: InspectorProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [start, setStart] = useState(w.start)
  const [end, setEnd] = useState(w.end ?? '')
  const [subtaskCategory, setSubtaskCategory] = useState(w.category)
  const live = w.subtasks.find(isLiveSubtask)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{categoryLabel(w.category)}</span>
        <button type="button" onClick={onClose} aria-label="Close inspector" className="text-gray-400">
          ×
        </button>
      </div>
      <span className="font-mono text-2xl tabular-nums text-gray-700 dark:text-gray-200">
        {formatHours(periodDuration(w, nowTime), timeFormat)}
      </span>
      <label className="flex items-center justify-between gap-2">
        <span className="text-gray-500 dark:text-gray-400">From</span>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => onSave(start, end || null)}
          className="rounded border px-1.5 py-0.5 font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span className="text-gray-500 dark:text-gray-400">To</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={() => onSave(start, end || null)}
          className="rounded border px-1.5 py-0.5 font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-500 dark:text-gray-400">Category</span>
        <select
          value={w.category}
          onChange={(e) => onCategory(e.target.value)}
          className="rounded border px-2 py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {optionsFor(w.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </label>

      {w.end === null && (
        <button
          type="button"
          onClick={onStop}
          className="rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700"
        >
          Stop at {nowTime}
        </button>
      )}

      <div className="border-t pt-3 dark:border-gray-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Subtasks</p>
        {w.subtasks.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">None</p>}
        <ul className="flex flex-col gap-1">
          {w.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                {isLiveSubtask(s)
                  ? formatHours(elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }), timeFormat)
                  : formatHours(s.hours, timeFormat)}
              </span>
              <span className="flex-1 truncate">{categoryLabel(s.category)}</span>
              {isLiveSubtask(s) ? (
                <button
                  type="button"
                  onClick={() => onStopSubtask(s.id)}
                  className="text-amber-600 dark:text-amber-400"
                >
                  stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemoveSubtask(s.id)}
                  aria-label={`Remove ${s.category} subtask`}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        {w.end === null && !live && (
          <div className="mt-2 flex items-center gap-1">
            <select
              aria-label="Subtask category"
              value={subtaskCategory}
              onChange={(e) => setSubtaskCategory(e.target.value)}
              className="min-w-0 flex-1 rounded border px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              {optionsFor(subtaskCategory, categories).map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onStartSubtask(subtaskCategory)}
              className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onDelete} className="mt-1 text-left text-xs text-red-600 dark:text-red-400">
        Delete period
      </button>
    </div>
  )
}
