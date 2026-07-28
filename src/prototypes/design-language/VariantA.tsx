// PROTOTYPE — Variant A: minimal chrome, keyboard-first command bar, timeline-first day view.
import { useEffect, useMemo, useRef, useState } from 'react'
import { MOCK_MONTH, TODAY_ISO, categoryFor, dayTotalHours, hoursForPeriod, categoryTotals } from './mockData'
import { styleFor } from './categoryStyles'

const DAY_START_HOUR = 8
const DAY_END_HOUR = 18

function timePos(iso: string): number {
  const d = new Date(iso)
  const hours = d.getHours() + d.getMinutes() / 60
  return ((hours - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtHours(h: number): string {
  return `${h.toFixed(1)}h`
}

function DayTimeline({ date }: { date: string }) {
  const day = MOCK_MONTH[date]
  if (!day) return <p className="text-sm text-gray-400">No data for this day.</p>
  if (day.dayTypeOverride && day.windows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400 dark:border-gray-700">
        {day.dayTypeOverride}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {day.windows.map((p) => {
          const s = timePos(p.start)
          const e = timePos(p.end ?? `${date}T15:40`)
          const style = styleFor(categoryFor(p.category).color)
          return (
            <div
              key={p.id}
              className={`absolute top-0 h-full ${style.bg} ${p.end === null ? 'animate-pulse' : ''}`}
              style={{ left: `${Math.max(0, s)}%`, width: `${Math.max(1, e - s)}%` }}
              title={categoryFor(p.category).label}
            />
          )
        })}
      </div>
      <ul className="space-y-2">
        {day.windows.map((p) => {
          const cat = categoryFor(p.category)
          const style = styleFor(cat.color)
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${style.border} ${style.bgSoft}`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className={`text-sm font-medium ${style.text}`}>{cat.label}</span>
              </div>
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                {fmtTime(p.start)} – {p.end ? fmtTime(p.end) : 'now'} · {fmtHours(hoursForPeriod(p))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function HeatmapStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const entries = Object.entries(MOCK_MONTH).sort(([a], [b]) => a.localeCompare(b))
  return (
    <div className="flex gap-1">
      {entries.map(([d, day]) => {
        const total = dayTotalHours(day)
        const intensity = day.dayTypeOverride
          ? 'bg-gray-100 dark:bg-gray-800'
          : total > 6
            ? 'bg-fuchsia-500'
            : total > 3
              ? 'bg-fuchsia-300'
              : total > 0
                ? 'bg-fuchsia-100 dark:bg-fuchsia-900/40'
                : 'bg-gray-50 dark:bg-gray-900'
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            title={`${d} · ${fmtHours(total)}`}
            className={`h-8 w-3 rounded-sm transition-transform hover:scale-125 ${intensity} ${
              d === selected ? 'ring-2 ring-fuchsia-500 ring-offset-1' : ''
            }`}
          />
        )
      })}
    </div>
  )
}

function CommandPalette({ onClose, onJump }: { onClose: () => void; onJump: (d: string) => void }) {
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const actions = [
    { label: 'Jump to today', run: () => onJump(TODAY_ISO) },
    { label: 'Jump to 2026-07-15', run: () => onJump('2026-07-15') },
    { label: 'Jump to 2026-07-21 (Vacation)', run: () => onJump('2026-07-21') },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && e.target instanceof Node && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center bg-black/40 pt-32">
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          className="w-full border-b border-gray-800 bg-transparent px-5 py-4 text-sm outline-none placeholder:text-gray-500"
        />
        <ul className="max-h-64 overflow-y-auto py-2">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  a.run()
                  onClose()
                }}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-gray-800"
              >
                {a.label}
              </button>
            </li>
          ))}
          {actions.length === 0 && <li className="px-5 py-3 text-sm text-gray-500">No matches</li>}
        </ul>
      </div>
    </div>
  )
}

export function VariantA() {
  const [selected, setSelected] = useState(TODAY_ISO)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const totals = useMemo(() => categoryTotals(MOCK_MONTH), [])
  const selectedTotal = dayTotalHours(MOCK_MONTH[selected] ?? { windows: [] })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="mx-auto max-w-2xl pb-24 text-gray-900 dark:text-gray-100">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400">
            {new Date(selected).toLocaleDateString([], { weekday: 'long' })}
          </p>
          <h1 className="text-3xl font-semibold tabular-nums">{selected}</h1>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:border-fuchsia-300 hover:text-fuchsia-600 dark:border-gray-700 dark:text-gray-400"
        >
          <span>Search or jump…</span>
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">⌘K</kbd>
        </button>
      </header>

      <div className="mb-8 flex items-baseline gap-4">
        <span className="text-4xl font-light tabular-nums">{fmtHours(selectedTotal)}</span>
        <span className="text-sm text-gray-400">logged today</span>
      </div>

      <DayTimeline date={selected} />

      <section className="mt-10">
        <p className="mb-2 text-xs uppercase tracking-widest text-gray-400">Last two weeks</p>
        <HeatmapStrip selected={selected} onSelect={setSelected} />
      </section>

      <section className="mt-10">
        <p className="mb-2 text-xs uppercase tracking-widest text-gray-400">Sprint breakdown</p>
        <div className="space-y-1.5">
          {totals.map((t) => {
            const cat = categoryFor(t.category)
            const style = styleFor(cat.color)
            const max = totals[0]?.hours || 1
            return (
              <div key={t.category} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-gray-500 dark:text-gray-400">{cat.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={`h-full ${style.bg}`} style={{ width: `${(t.hours / max) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-mono text-xs text-gray-400">{fmtHours(t.hours)}</span>
              </div>
            )
          })}
        </div>
      </section>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onJump={(d) => {
            setSelected(d)
          }}
        />
      )}
    </div>
  )
}
