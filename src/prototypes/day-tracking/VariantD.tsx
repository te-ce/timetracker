// PROTOTYPE — Variant D "Editable Table": a dense spreadsheet-style grid where
// every cell is directly editable, no edit mode, no cards. Keyboard-first:
// Tab moves across cells, Enter commits, Enter on the draft row appends.
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
  type ProtoActions,
  type VariantProps,
} from './protoShared'

const GRID = 'grid grid-cols-[1.5rem_6rem_6rem_4rem_minmax(8rem,1fr)_7rem] items-center gap-2'
const CELL_INPUT =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-sm tabular-nums hover:border-gray-300 focus:border-indigo-400 focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-700 dark:focus:border-indigo-500'
const CELL_SELECT =
  'w-full max-w-[14rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-300 focus:border-indigo-400 focus:bg-white focus:outline-none dark:text-gray-200 dark:hover:border-gray-600 dark:focus:bg-gray-700'

export function VariantD({ date, windows, repository, categories, defaultCategory, nowTime }: VariantProps) {
  const actions = useProtoActions(repository, date, windows)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [draftCategory, setDraftCategory] = useState(defaultCategory)

  const rows = sortedPeriods(windows)
  const running = windows.find((w) => w.end === null)
  const total = windows.reduce((sum, w) => sum + periodDuration(w, nowTime), 0)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function commitDraft() {
    const start = draftStart || nowHHMM()
    actions.addPeriod(start, draftEnd || null, draftCategory)
    setDraftStart('')
    setDraftEnd('')
  }

  return (
    <div className="rounded-lg border dark:border-gray-700">
      <div
        className={`${GRID} border-b bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400`}
      >
        <span />
        <span>From</span>
        <span>To</span>
        <span className="text-right">Dur</span>
        <span>Category</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y dark:divide-gray-700/60">
        {rows.length === 0 && (
          <p className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500">No rows — type into the draft row below.</p>
        )}
        {rows.map((w) => (
          <div key={w.id}>
            <PeriodRow
              key={`${w.id}:${w.start}:${w.end ?? ''}`}
              w={w}
              nowTime={nowTime}
              categories={categories}
              actions={actions}
              expanded={expanded.has(w.id)}
              onToggle={() => toggle(w.id)}
            />
            {expanded.has(w.id) && (
              <div className="bg-gray-50/70 px-3 pb-2 dark:bg-gray-800/40">
                {w.subtasks.length === 0 ? (
                  <p className="py-1 pl-8 text-xs text-gray-400 dark:text-gray-500">No subtasks</p>
                ) : (
                  w.subtasks.map((s) => (
                    <div key={s.id} className={`${GRID} py-1 text-xs text-gray-600 dark:text-gray-300`}>
                      <span className="text-center text-gray-300 dark:text-gray-600">↳</span>
                      <span className="font-mono tabular-nums">{s.startedAt ?? '—'}</span>
                      <span className="font-mono tabular-nums">
                        {isLiveSubtask(s) ? (
                          <button
                            type="button"
                            onClick={() => actions.stopSubtaskNow(w.id, s.id)}
                            className="rounded bg-amber-100 px-1.5 py-0.5 font-sans font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          >
                            stop now
                          </button>
                        ) : (
                          (s.stoppedAt ?? '—')
                        )}
                      </span>
                      <span className="text-right font-mono tabular-nums">
                        {isLiveSubtask(s)
                          ? formatHours(elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }), timeFormat)
                          : formatHours(s.hours, timeFormat)}
                      </span>
                      <span className="truncate">
                        {categoryLabel(s.category)}
                        {s.note && <span className="ml-1 italic text-gray-400">{s.note}</span>}
                      </span>
                      <span className="text-right">
                        <button
                          type="button"
                          onClick={() => actions.removeSubtask(w.id, s.id)}
                          aria-label={`Remove ${s.category} subtask`}
                          className="px-1 text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))
                )}
                {w.end === null && !w.subtasks.some(isLiveSubtask) && (
                  <button
                    type="button"
                    onClick={() => actions.startSubtaskNow(w.id, w.category)}
                    className="ml-8 mt-1 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    ▶ start subtask now
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

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
            placeholder={nowTime}
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
          <span className="text-right">
            <button
              type="button"
              onClick={commitDraft}
              disabled={!!running && !draftEnd}
              className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {draftEnd ? 'Add row' : running ? 'Running…' : 'Start now'}
            </button>
          </span>
        </div>
      </div>

      <div className={`${GRID} border-t bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60`}>
        <span />
        <span className="col-span-2 text-gray-400 dark:text-gray-500">
          ⏎ commit · ⇥ next cell · click ▸ for subtasks
        </span>
        <span className="text-right font-mono text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
          {formatHours(total, timeFormat)}
        </span>
        <span className="text-gray-400 dark:text-gray-500">{rows.length} rows</span>
        <span />
      </div>
    </div>
  )
}

interface PeriodRowProps {
  w: WorkPeriod
  nowTime: string
  categories: string[]
  actions: ProtoActions
  expanded: boolean
  onToggle: () => void
}

function PeriodRow({ w, nowTime, categories, actions, expanded, onToggle }: PeriodRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [start, setStart] = useState(w.start)
  const [end, setEnd] = useState(w.end ?? '')
  const isRunning = w.end === null

  function commit() {
    if (start === w.start && (end || null) === w.end) return
    actions.setTimes(w, start, end || null)
  }

  return (
    <div className={`${GRID} px-3 py-1 ${isRunning ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
        aria-expanded={expanded}
        className="text-center text-xs text-gray-400 hover:text-indigo-500"
      >
        {expanded ? '▾' : '▸'}
        {w.subtasks.length > 0 && <span className="ml-0.5 text-[10px]">{w.subtasks.length}</span>}
      </button>
      <input
        type="time"
        aria-label={`Start time of ${w.category} period`}
        value={start}
        onChange={(e) => setStart(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        className={CELL_INPUT}
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
          className={CELL_INPUT}
        />
      )}
      <span
        className={`text-right font-mono text-sm tabular-nums ${
          isRunning ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'
        }`}
      >
        {formatHours(periodDuration(w, nowTime), timeFormat)}
      </span>
      <select
        aria-label={`Category of period starting ${w.start}`}
        value={w.category}
        onChange={(e) => actions.setCategory(w.id, e.target.value)}
        className={CELL_SELECT}
      >
        {optionsFor(w.category, categories).map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <span className="flex items-center justify-end gap-1">
        {isRunning && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
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
  )
}
