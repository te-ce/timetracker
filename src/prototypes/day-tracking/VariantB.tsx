// PROTOTYPE — Variant B "Ribbon + Rows": keeps the proportional picture of the
// day, but never hides detail behind it. A narrow ribbon on the left carries the
// shape (proportions, gaps, now line); the rows on the right are always fully
// expanded, so short periods stay readable and nothing needs clicking to be seen.
import { useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { parseMinutes } from '../../shared/worktime'
import { LogSubtaskForm } from './LogSubtaskForm'
import {
  categoryLabel,
  deriveSegments,
  findActiveTracking,
  findGaps,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type ProtoActions,
  type Segment,
  type VariantProps,
} from './protoShared'

const RIBBON_HEIGHT = 460

const COLORS = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-violet-500']
const SOFT = [
  'bg-indigo-100 dark:bg-indigo-900/40',
  'bg-sky-100 dark:bg-sky-900/40',
  'bg-amber-100 dark:bg-amber-900/40',
  'bg-teal-100 dark:bg-teal-900/40',
  'bg-fuchsia-100 dark:bg-fuchsia-900/40',
  'bg-violet-100 dark:bg-violet-900/40',
]

function colorIndex(category: string): number {
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return hash % COLORS.length
}
const strong = (c: string) => COLORS[colorIndex(c)] ?? 'bg-gray-400'
const soft = (c: string) => SOFT[colorIndex(c)] ?? 'bg-gray-100 dark:bg-gray-800'

export function VariantB({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [startCategory, setStartCategory] = useState(defaultCategory)

  const periods = sortedPeriods(windows)
  const active = findActiveTracking(windows, nowTime)
  const gaps = findGaps(windows)

  const nowMins = parseMinutes(nowTime)
  const firstMins = periods.length > 0 ? Math.min(...periods.map((w) => parseMinutes(w.start))) : nowMins
  const lastMins = Math.max(nowMins, ...periods.map((w) => parseMinutes(w.end ?? nowTime)))
  const axisStart = Math.floor(firstMins / 60) * 60
  const axisEnd = Math.max(axisStart + 120, Math.ceil(lastMins / 60) * 60)
  const span = axisEnd - axisStart

  const pos = (time: string) => ((parseMinutes(time) - axisStart) / span) * RIBBON_HEIGHT
  const size = (from: string, to: string) =>
    Math.max(2, ((parseMinutes(to) - parseMinutes(from)) / span) * RIBBON_HEIGHT)

  const hourTicks: number[] = []
  for (let m = axisStart; m <= axisEnd; m += 60) hourTicks.push(m)

  return (
    <div className="flex gap-5">
      <div className="relative shrink-0" style={{ height: `${RIBBON_HEIGHT}px`, width: '5.5rem' }}>
        {hourTicks.map((m) => (
          <span
            key={m}
            className="absolute left-0 flex w-full items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500"
            style={{ top: `${((m - axisStart) / span) * RIBBON_HEIGHT}px` }}
          >
            <span className="w-9 -translate-y-1/2 text-right font-mono">
              {String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:00
            </span>
            <span className="h-px flex-1 -translate-y-1/2 bg-gray-200 dark:bg-gray-700" />
          </span>
        ))}
        <div className="absolute bottom-0 right-2 top-0 w-8 rounded bg-gray-100 dark:bg-gray-800/70">
          {periods.flatMap((w) =>
            deriveSegments(w, nowTime)
              .filter((seg) => seg.placed && seg.start)
              .map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  aria-label={`${categoryLabel(seg.category)} ${seg.start} to ${seg.end ?? nowTime}`}
                  onClick={() => setHighlight(w.id)}
                  className={`absolute left-0 w-full ${strong(seg.category)} ${
                    seg.live ? 'ring-1 ring-emerald-500' : ''
                  } ${highlight === w.id ? 'outline outline-2 outline-offset-1 outline-indigo-500' : ''} ${
                    seg.kind === 'subtask' ? 'opacity-60' : ''
                  }`}
                  style={{
                    top: `${pos(seg.start ?? w.start)}px`,
                    height: `${size(seg.start ?? w.start, seg.end ?? nowTime)}px`,
                  }}
                />
              )),
          )}
          {gaps.map((g) => (
            <span
              key={g.start}
              title={`gap ${formatHours(g.hours, timeFormat)}`}
              className="absolute left-0 w-full border-y border-dashed border-gray-300 dark:border-gray-600"
              style={{ top: `${pos(g.start)}px`, height: `${size(g.start, g.end)}px` }}
            />
          ))}
          <span
            className="absolute -left-1 -right-1 flex items-center"
            style={{ top: `${pos(nowTime)}px` }}
            aria-hidden="true"
          >
            <span className="h-0.5 w-full bg-red-500" />
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {periods.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nothing recorded — start below.</p>
        )}
        {periods.map((w) => (
          <PeriodRow
            key={`${w.id}:${w.start}:${w.end ?? ''}`}
            w={w}
            nowTime={nowTime}
            categories={categories}
            actions={actions}
            highlighted={highlight === w.id}
            activeSubtaskId={active?.subtask?.id}
            onFocus={() => setHighlight(w.id)}
          />
        ))}

        {gaps.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {gaps.map((g) => (
              <li
                key={g.start}
                className="flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 dark:border-gray-600"
              >
                <span>
                  untracked {formatHours(g.hours, timeFormat)} · {g.start}–{g.end}
                </span>
                <button
                  type="button"
                  onClick={() => actions.addPeriod(g.start, g.end, defaultCategory)}
                  className="font-medium text-indigo-600 dark:text-indigo-400"
                >
                  fill
                </button>
              </li>
            ))}
          </ul>
        )}

        {!active && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 dark:border-gray-700">
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
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ▶ Start at {nowTime}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface PeriodRowProps {
  w: WorkPeriod
  nowTime: string
  categories: string[]
  actions: ProtoActions
  highlighted: boolean
  activeSubtaskId: string | undefined
  onFocus: () => void
}

function PeriodRow({ w, nowTime, categories, actions, highlighted, activeSubtaskId, onFocus }: PeriodRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const isRunning = w.end === null
  const duration = periodDuration(w, nowTime)
  const segments = deriveSegments(w, nowTime)

  return (
    <div
      onMouseEnter={onFocus}
      className={`rounded-xl border px-3 py-2 ${
        highlighted ? 'border-indigo-400 dark:border-indigo-600' : 'dark:border-gray-700'
      } ${isRunning ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
          {w.start} – {w.end ?? 'now'}
        </span>
        <span className="font-mono text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {formatHours(duration, timeFormat)}
        </span>
        <select
          aria-label={`Main category of period starting ${w.start}`}
          value={w.category}
          onChange={(e) => actions.setCategory(w.id, e.target.value)}
          className="rounded border-transparent bg-transparent py-0.5 text-sm font-medium hover:border-gray-300 dark:text-gray-100 dark:hover:border-gray-600"
        >
          {optionsFor(w.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-2">
          {isRunning && !activeSubtaskId && (
            <button
              type="button"
              onClick={() => actions.startSubtaskNow(w.id, w.category)}
              className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
            >
              ▶ subtask
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={() => actions.stop(w)}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
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

      <div className="mt-2 flex h-3 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
        {segments.map((seg) => (
          <span
            key={seg.key}
            title={`${categoryLabel(seg.category)} ${formatHours(seg.hours, timeFormat)}`}
            className={`${strong(seg.category)} ${seg.kind === 'main' ? '' : 'opacity-50'} ${
              seg.live ? 'animate-pulse' : ''
            } ${seg.placed ? '' : 'border-y border-dashed border-white/70'}`}
            style={{ width: `${(seg.hours / Math.max(duration, 0.01)) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-1.5 flex flex-col">
        {segments.map((seg) => (
          <SegmentRow key={seg.key} seg={seg} w={w} nowTime={nowTime} actions={actions} />
        ))}
      </ul>

      <div className="mt-1">
        <LogSubtaskForm
          categories={categories}
          defaultCategory={w.category}
          onLog={(category, hours) => actions.logSubtask(w.id, category, hours)}
          label="+ forgot to track something?"
          compact
        />
      </div>
    </div>
  )
}

function SegmentRow({
  seg,
  w,
  nowTime,
  actions,
}: {
  seg: Segment
  w: WorkPeriod
  nowTime: string
  actions: ProtoActions
}) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const share = seg.hours / Math.max(periodDuration(w, nowTime), 0.01)

  return (
    <li className={`flex items-center gap-2 py-0.5 text-xs ${seg.live ? 'font-medium' : ''}`}>
      <span
        className={`h-2 w-2 shrink-0 rounded-sm ${seg.kind === 'main' ? strong(seg.category) : soft(seg.category)}`}
      />
      <span
        className={`w-28 shrink-0 truncate ${seg.live ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}
      >
        {seg.kind === 'subtask' ? '↳ ' : ''}
        {categoryLabel(seg.category)}
      </span>
      <span className="w-14 shrink-0 text-right font-mono tabular-nums text-gray-600 dark:text-gray-300">
        {formatHours(seg.hours, timeFormat)}
      </span>
      <span className="w-10 shrink-0 text-right font-mono tabular-nums text-gray-400 dark:text-gray-500">
        {Math.round(share * 100)}%
      </span>
      <span className="w-24 shrink-0 font-mono tabular-nums text-gray-400 dark:text-gray-500">
        {seg.placed ? `${seg.start}–${seg.end ?? 'now'}` : 'no times'}
      </span>
      {seg.note && <span className="truncate italic text-gray-400 dark:text-gray-500">{seg.note}</span>}
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {seg.live && seg.kind === 'subtask' && seg.subtask && (
          <button
            type="button"
            onClick={() => actions.stopSubtaskNow(w.id, seg.subtask?.id ?? '')}
            className="rounded border border-amber-300 px-1.5 py-0.5 font-medium text-amber-700 dark:border-amber-700 dark:text-amber-300"
          >
            stop subtask
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
  )
}
