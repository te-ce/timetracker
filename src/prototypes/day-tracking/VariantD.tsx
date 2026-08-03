// PROTOTYPE — Variant D "Editable Table": a dense grid where every cell is
// directly editable and nothing is ever collapsed. Each period is followed by all
// of its segments — the main-category stretch and every subtask, tracked or
// retro-logged — so nothing can be forgotten behind a chevron.
import { useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { elapsedHours, nowHHMM } from '../../shared/worktime'
import { LogSubtaskForm, parseDuration } from './LogSubtaskForm'
import {
  categoryLabel,
  categoryTotals,
  deriveSegments,
  findActiveTracking,
  optionsFor,
  periodDuration,
  sortedPeriods,
  useProtoActions,
  type ProtoActions,
  type Segment,
  type VariantProps,
} from './protoShared'

const GRID = 'grid grid-cols-[1.25rem_5.5rem_5.5rem_4rem_minmax(8rem,1fr)_3.5rem_2rem] items-center gap-2'
const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-sm tabular-nums hover:border-gray-300 focus:border-indigo-400 focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-700 dark:focus:border-indigo-500'
const CELL_SELECT =
  'w-full max-w-[14rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-300 focus:border-indigo-400 focus:bg-white focus:outline-none dark:text-gray-200 dark:hover:border-gray-600 dark:focus:bg-gray-700'

export function VariantD({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [draftCategory, setDraftCategory] = useState(defaultCategory)

  const rows = sortedPeriods(windows)
  const active = findActiveTracking(windows, nowTime)
  const total = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)
  const totals = [...categoryTotals(windows, nowTime).entries()]
    .filter(([, h]) => h > 0.001)
    .toSorted((a, b) => b[1] - a[1])

  function commitDraft() {
    actions.addPeriod(draftStart || nowHHMM(), draftEnd || null, draftCategory)
    setDraftStart('')
    setDraftEnd('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="font-mono text-base font-semibold tabular-nums text-gray-800 dark:text-gray-100">
          {formatHours(total, timeFormat)}
        </span>
        {totals.map(([category, h]) => (
          <span key={category} className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-300">{categoryLabel(category)}</span>
            <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
              {formatHours(h, timeFormat)}
            </span>
          </span>
        ))}
        <span className="ml-auto">
          {active ? (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              tracking {categoryLabel(active.category)} since {active.since}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">not tracking</span>
          )}
        </span>
      </div>

      <div className="rounded-lg border dark:border-gray-700">
        <div
          className={`${GRID} border-b bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400`}
        >
          <span />
          <span>From</span>
          <span>To</span>
          <span className="text-right">Dur</span>
          <span>Category</span>
          <span className="text-right">Share</span>
          <span />
        </div>

        <div className="divide-y dark:divide-gray-700/60">
          {rows.length === 0 && (
            <p className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500">
              No rows — type into the draft row below.
            </p>
          )}
          {rows.map((w) => {
            const segments = deriveSegments(w, nowTime)
            const canStartSubtask = w.end === null && !active?.subtask
            return (
              <div key={w.id} className={w.end === null ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                <PeriodRow
                  key={`${w.id}:${w.start}:${w.end ?? ''}`}
                  w={w}
                  nowTime={nowTime}
                  categories={categories}
                  actions={actions}
                  total={total}
                />
                {segments.map((seg) => (
                  <SegmentRow
                    key={seg.key}
                    seg={seg}
                    periodId={w.id}
                    dayTotal={total}
                    categories={categories}
                    actions={actions}
                  />
                ))}
                <div className={`${GRID} px-3 pb-1.5 pt-0.5`}>
                  <span />
                  <span className="col-span-4 flex flex-wrap items-center gap-4">
                    {canStartSubtask && (
                      <button
                        type="button"
                        onClick={() => actions.startSubtaskNow(w.id, w.category)}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
                      >
                        ▶ start subtask now
                      </button>
                    )}
                    <LogSubtaskForm
                      categories={categories}
                      defaultCategory={w.category}
                      onLog={(category, hours) => actions.logSubtask(w.id, category, hours)}
                      label="+ log untracked subtask (e.g. 30m)"
                      compact
                    />
                  </span>
                  <span />
                  <span />
                </div>
              </div>
            )
          })}

          <div className={`${GRID} bg-indigo-50/40 px-3 py-1.5 dark:bg-indigo-950/20`}>
            <span className="text-center text-indigo-400">+</span>
            <input
              type="time"
              aria-label="Draft start"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft()
              }}
              className={CELL_INPUT}
            />
            <input
              type="time"
              aria-label="Draft end"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft()
              }}
              className={CELL_INPUT}
            />
            <span className="text-right font-mono text-sm tabular-nums text-gray-400 dark:text-gray-500">
              {draftStart && draftEnd ? formatHours(elapsedHours(draftStart, draftEnd), timeFormat) : '—'}
            </span>
            <select
              aria-label="Draft category"
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className={CELL_SELECT}
            >
              {optionsFor(draftCategory, categories).map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
            <span className="col-span-2 text-right">
              <button
                type="button"
                onClick={commitDraft}
                disabled={!!active && !draftEnd}
                title={active && !draftEnd ? 'Stop the running period first' : undefined}
                className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                {draftEnd ? 'Add row' : active ? 'Running…' : 'Start now'}
              </button>
            </span>
          </div>
        </div>

        <div className={`${GRID} border-t bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60`}>
          <span />
          <span className="col-span-2 text-gray-400 dark:text-gray-500">⏎ commit · ⇥ next cell</span>
          <span className="text-right font-mono text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {formatHours(total, timeFormat)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {rows.length} period{rows.length === 1 ? '' : 's'}
          </span>
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

function PeriodRow({
  w,
  nowTime,
  categories,
  actions,
  total,
}: {
  w: WorkPeriod
  nowTime: string
  categories: string[]
  actions: ProtoActions
  total: number
}) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [start, setStart] = useState(w.start)
  const [end, setEnd] = useState(w.end ?? '')
  const isRunning = w.end === null
  const duration = periodDuration(w, nowTime)

  function commit() {
    if (start === w.start && (end || null) === w.end) return
    actions.setTimes(w, start, end || null)
  }

  return (
    <div className={`${GRID} px-3 pt-1.5`}>
      <span className="text-center text-xs text-gray-300 dark:text-gray-600" aria-hidden="true">
        ▍
      </span>
      <input
        type="time"
        aria-label={`Start time of ${w.category} period`}
        value={start}
        onChange={(e) => setStart(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        className={`${CELL_INPUT} font-semibold`}
      />
      {isRunning ? (
        <button
          type="button"
          onClick={() => actions.stop(w)}
          className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          ■ stop now
        </button>
      ) : (
        <input
          type="time"
          aria-label={`End time of ${w.category} period`}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          className={`${CELL_INPUT} font-semibold`}
        />
      )}
      <span
        className={`text-right font-mono text-sm font-semibold tabular-nums ${
          isRunning ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {formatHours(duration, timeFormat)}
      </span>
      <select
        aria-label={`Main category of period starting ${w.start}`}
        value={w.category}
        onChange={(e) => actions.setCategory(w.id, e.target.value)}
        className={`${CELL_SELECT} font-medium`}
      >
        {optionsFor(w.category, categories).map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <span className="text-right font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
        {Math.round((duration / Math.max(total, 0.01)) * 100)}%
      </span>
      <button
        type="button"
        onClick={() => actions.remove(w.id)}
        aria-label={`Delete period starting ${w.start}`}
        className="text-gray-400 hover:text-red-500"
      >
        ×
      </button>
    </div>
  )
}

function SegmentRow({
  seg,
  periodId,
  dayTotal,
  categories,
  actions,
}: {
  seg: Segment
  periodId: string
  dayTotal: number
  categories: string[]
  actions: ProtoActions
}) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [hoursText, setHoursText] = useState(formatHours(seg.hours, timeFormat))
  const isMain = seg.kind === 'main'

  return (
    <div className={`${GRID} px-3 py-0.5 text-xs ${seg.live ? 'font-medium' : ''}`}>
      <span className="text-center text-gray-300 dark:text-gray-600" aria-hidden="true">
        {isMain ? '│' : '↳'}
      </span>
      <span className="pl-1 font-mono tabular-nums text-gray-400 dark:text-gray-500">
        {seg.placed ? seg.start : '—'}
      </span>
      <span className="font-mono tabular-nums text-gray-400 dark:text-gray-500">
        {seg.live && seg.kind === 'subtask' && seg.subtask ? (
          <button
            type="button"
            onClick={() => actions.stopSubtaskNow(periodId, seg.subtask?.id ?? '')}
            className="rounded bg-amber-100 px-1.5 py-0.5 font-sans font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
          >
            stop subtask
          </button>
        ) : seg.live ? (
          <span className="text-emerald-600 dark:text-emerald-400">running</span>
        ) : seg.placed ? (
          seg.end
        ) : (
          '—'
        )}
      </span>
      {seg.subtask && !seg.placed ? (
        <input
          type="text"
          aria-label={`Duration of ${seg.category} subtask`}
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
          onBlur={() => {
            const parsed = parseDuration(hoursText)
            if (parsed !== null && parsed > 0 && seg.subtask) actions.setSubtaskHours(periodId, seg.subtask, parsed)
          }}
          className={`${CELL_INPUT} text-right`}
        />
      ) : (
        <span
          className={`text-right font-mono tabular-nums ${
            seg.live ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {formatHours(seg.hours, timeFormat)}
        </span>
      )}
      {seg.subtask ? (
        <select
          aria-label={`Category of ${seg.category} subtask`}
          value={seg.category}
          onChange={(e) => seg.subtask && actions.setSubtaskCategory(periodId, seg.subtask, e.target.value)}
          className={CELL_SELECT}
        >
          {optionsFor(seg.category, categories).map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      ) : (
        <span className="truncate pl-1 text-gray-500 dark:text-gray-400">
          {categoryLabel(seg.category)} <span className="text-gray-400 dark:text-gray-500">(main)</span>
        </span>
      )}
      <span className="text-right font-mono tabular-nums text-gray-400 dark:text-gray-500">
        {Math.round((seg.hours / Math.max(dayTotal, 0.01)) * 100)}%
      </span>
      {seg.subtask && !seg.live ? (
        <button
          type="button"
          onClick={() => actions.removeSubtask(periodId, seg.subtask?.id ?? '')}
          aria-label={`Remove ${seg.category} subtask`}
          className="text-gray-400 hover:text-red-500"
        >
          ×
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}
