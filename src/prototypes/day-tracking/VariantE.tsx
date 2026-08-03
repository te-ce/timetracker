// PROTOTYPE — Variant E "Segment Stream": since only one thing can ever be
// tracked at a time, the day is literally one chain of segments. So drop the
// period/subtask nesting from the layout: render a single flat chronological
// stream, keep the period only as a bracket in the gutter, and put the numbers
// in a sidebar that is always on screen.
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
  type Gap,
  type ProtoActions,
  type Segment,
  type VariantProps,
} from './protoShared'

type StreamItem =
  | { type: 'segment'; key: string; seg: Segment; period: WorkPeriod; first: boolean; last: boolean }
  | { type: 'gap'; key: string; gap: Gap }

function buildStream(windows: WorkPeriod[], nowTime: string): StreamItem[] {
  const periods = sortedPeriods(windows)
  const gaps = new Map(findGaps(windows).map((g) => [g.start, g]))
  const items: StreamItem[] = []

  periods.forEach((w) => {
    const segments = deriveSegments(w, nowTime)
    segments.forEach((seg, i) => {
      items.push({
        type: 'segment',
        key: seg.key,
        seg,
        period: w,
        first: i === 0,
        last: i === segments.length - 1,
      })
    })
    const gap = w.end ? gaps.get(w.end) : undefined
    if (gap) items.push({ type: 'gap', key: `gap:${gap.start}`, gap })
  })

  return items
}

export function VariantE({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [startCategory, setStartCategory] = useState(defaultCategory)

  const active = findActiveTracking(windows, nowTime)
  const stream = buildStream(windows, nowTime)
  const dayTotal = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)
  const totals = [...categoryTotals(windows, nowTime).entries()]
    .filter(([, h]) => h > 0.001)
    .toSorted((a, b) => b[1] - a[1])
  const untracked = findGaps(windows).reduce((sum, g) => sum + g.hours, 0)
  const maxTotal = Math.max(0.01, ...totals.map(([, h]) => h))

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
          active
            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
            : 'border-dashed dark:border-gray-700'
        }`}
      >
        {active ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatHours(active.elapsed, timeFormat)}
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-100">{categoryLabel(active.category)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {active.subtask ? 'subtask' : 'main'} · since {active.since}
            </span>
            <span className="ml-auto flex items-center gap-2">
              {active.subtask ? (
                <button
                  type="button"
                  onClick={() => actions.stopSubtaskNow(active.period.id, active.subtask?.id ?? '')}
                  className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                >
                  ■ stop subtask → back to {categoryLabel(active.period.category)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => actions.startSubtaskNow(active.period.id, active.period.category)}
                  className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300"
                >
                  ▶ switch to subtask
                </button>
              )}
              <button
                type="button"
                onClick={() => actions.stop(active.period)}
                className="rounded-lg bg-red-600 px-4 py-1 text-sm font-semibold text-white hover:bg-red-700"
              >
                ■ Stop work
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="text-gray-500 dark:text-gray-400">Not tracking</span>
            <select
              aria-label="Category to start"
              value={startCategory}
              onChange={(e) => setStartCategory(e.target.value)}
              className="rounded-lg border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
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
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-1 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ▶ Start at {nowTime}
            </button>
          </>
        )}
      </div>

      <div className="flex gap-4">
        <ol className="min-w-0 flex-1">
          {stream.length === 0 && (
            <li className="py-4 text-sm text-gray-400 dark:text-gray-500">Nothing tracked today yet.</li>
          )}
          {stream.map((item) =>
            item.type === 'gap' ? (
              <li key={item.key} className="flex items-center gap-3 py-1 pl-6 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-24 shrink-0 font-mono tabular-nums">
                  {item.gap.start}–{item.gap.end}
                </span>
                <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                  {formatHours(item.gap.hours, timeFormat)}
                </span>
                <span className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                <span>untracked</span>
                <button
                  type="button"
                  onClick={() => actions.addPeriod(item.gap.start, item.gap.end, defaultCategory)}
                  className="font-medium text-indigo-600 underline decoration-dotted dark:text-indigo-400"
                >
                  fill
                </button>
              </li>
            ) : (
              <StreamRow key={item.key} item={item} categories={categories} actions={actions} dayTotal={dayTotal} />
            ),
          )}
        </ol>

        <aside className="w-56 shrink-0">
          <div className="sticky top-2 flex flex-col gap-3 rounded-lg border p-3 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Worked today
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                {formatHours(dayTotal, timeFormat)}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {totals.map(([category, h]) => (
                <li key={category} className="text-xs">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-gray-700 dark:text-gray-300">{categoryLabel(category)}</span>
                    <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                      {formatHours(h, timeFormat)}
                    </span>
                  </span>
                  <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: `${(h / maxTotal) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
              {totals.length === 0 && <li className="text-xs text-gray-400 dark:text-gray-500">nothing yet</li>}
            </ul>
            <div className="border-t pt-2 text-xs dark:border-gray-700">
              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">segments</span>
                <span className="font-mono tabular-nums">{stream.filter((i) => i.type === 'segment').length}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">untracked gaps</span>
                <span className="font-mono tabular-nums">{formatHours(untracked, timeFormat)}</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

interface StreamRowProps {
  item: { type: 'segment'; seg: Segment; period: WorkPeriod; first: boolean; last: boolean }
  categories: string[]
  actions: ProtoActions
  dayTotal: number
}

function StreamRow({ item, categories, actions, dayTotal }: StreamRowProps) {
  const { seg, period, first, last } = item
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(seg.start ?? period.start)
  const [end, setEnd] = useState(seg.end ?? '')

  function save() {
    if (seg.kind === 'main') {
      actions.setTimes(period, first ? start : period.start, last ? end || null : period.end)
    } else if (seg.subtask && start && end) {
      actions.setSubtaskTimes(period.id, seg.subtask, start, end)
    }
    setEditing(false)
  }

  return (
    <li
      className={`flex items-center gap-3 py-1 text-sm ${
        seg.live ? 'rounded bg-emerald-50 dark:bg-emerald-950/30' : ''
      }`}
    >
      <span className="relative flex w-4 shrink-0 justify-center self-stretch" aria-hidden="true">
        <span
          className={`w-0.5 ${first ? 'mt-1.5' : ''} ${last ? 'mb-1.5' : ''} ${
            period.end === null ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      </span>

      {editing ? (
        <span className="flex items-center gap-1">
          <input
            type="time"
            aria-label="Edit segment start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border px-1 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <input
            type="time"
            aria-label="Edit segment end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border px-1 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button type="button" onClick={save} className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={!seg.placed}
          aria-label={`Edit times of ${seg.category} segment`}
          className="w-24 shrink-0 text-left font-mono text-xs tabular-nums text-gray-500 enabled:hover:text-indigo-600 disabled:cursor-default dark:text-gray-400 dark:enabled:hover:text-indigo-400"
        >
          {seg.placed ? `${seg.start}–${seg.end ?? 'now'}` : '· · · ·'}
        </button>
      )}

      <span
        className={`w-14 shrink-0 text-right font-mono text-sm tabular-nums ${
          seg.live ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {formatHours(seg.hours, timeFormat)}
      </span>

      {seg.subtask ? (
        <select
          aria-label={`Category of ${seg.category} subtask`}
          value={seg.category}
          onChange={(e) => seg.subtask && actions.setSubtaskCategory(period.id, seg.subtask, e.target.value)}
          className="min-w-0 max-w-[12rem] flex-1 rounded border-transparent bg-transparent py-0.5 text-sm hover:border-gray-300 dark:text-gray-100 dark:hover:border-gray-600"
        >
          {optionsFor(seg.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      ) : (
        <select
          aria-label={`Main category of period starting ${period.start}`}
          value={period.category}
          onChange={(e) => actions.setCategory(period.id, e.target.value)}
          className="min-w-0 max-w-[12rem] flex-1 rounded border-transparent bg-transparent py-0.5 text-sm font-medium hover:border-gray-300 dark:text-gray-100 dark:hover:border-gray-600"
        >
          {optionsFor(period.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      )}

      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {seg.kind === 'main' ? 'main' : seg.placed ? 'subtask' : 'retro'}
      </span>
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
        {Math.round((seg.hours / Math.max(dayTotal, 0.01)) * 100)}%
      </span>

      <span className="flex w-40 shrink-0 items-center justify-end gap-2">
        {last && period.end === null && !seg.live && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">paused</span>
        )}
        {seg.live && seg.kind === 'subtask' && seg.subtask && (
          <button
            type="button"
            onClick={() => actions.stopSubtaskNow(period.id, seg.subtask?.id ?? '')}
            className="rounded border border-amber-300 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:text-amber-300"
          >
            stop subtask
          </button>
        )}
        {seg.live && seg.kind === 'main' && (
          <button
            type="button"
            onClick={() => actions.stop(period)}
            className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
          >
            stop
          </button>
        )}
        {last && (
          <LogSubtaskForm
            categories={categories}
            defaultCategory={period.category}
            onLog={(category, hours) => actions.logSubtask(period.id, category, hours)}
            label="+ log"
            compact
          />
        )}
        {seg.subtask && !seg.live && (
          <button
            type="button"
            onClick={() => actions.removeSubtask(period.id, seg.subtask?.id ?? '')}
            aria-label={`Remove ${seg.category} subtask`}
            className="text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        )}
        {last && !seg.subtask && period.end !== null && (
          <button
            type="button"
            onClick={() => actions.remove(period.id)}
            aria-label={`Delete period starting ${period.start}`}
            className="text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        )}
      </span>
    </li>
  )
}
