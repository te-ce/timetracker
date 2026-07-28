// PROTOTYPE — Variant C: no page switching; one continuous scrollable journal of days,
// with sprint/settings surfaced as inline cards and popovers rather than separate screens.
import { useEffect, useRef, useState } from 'react'
import type { Day } from '../../infra/repositories/types'
import {
  MOCK_MONTH,
  TODAY_ISO,
  categoryFor,
  categoryTotals,
  dayTotalHours,
  hoursForPeriod,
  SPRINT_TARGET_HOURS,
  MOCK_SPRINT_HOURS,
} from './mockData'
import { styleFor } from './categoryStyles'

function fmtHours(h: number): string {
  return `${h.toFixed(1)}h`
}

function weekdayLabel(date: string): string {
  return new Date(date).toLocaleDateString([], { weekday: 'short' })
}

function DayCard({ date, day }: { date: string; day: Day }) {
  const total = dayTotalHours(day)
  const isToday = date === TODAY_ISO
  const [noteOpen, setNoteOpen] = useState(false)

  if (day.dayTypeOverride && day.windows.length === 0) {
    return (
      <div className="flex items-center gap-4 border-l-2 border-gray-200 py-3 pl-6 text-sm text-gray-400 dark:border-gray-800">
        <span className="w-24 flex-shrink-0 font-mono">
          {weekdayLabel(date)} {date.slice(-2)}
        </span>
        <span className="italic">{day.dayTypeOverride}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative border-l-2 py-4 pl-6 ${isToday ? 'border-fuchsia-500' : 'border-gray-200 dark:border-gray-800'}`}
    >
      <span
        className={`absolute -left-[7px] top-5 h-3 w-3 rounded-full ${isToday ? 'bg-fuchsia-500' : 'bg-gray-300 dark:bg-gray-700'}`}
      />
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-sm text-gray-500">
          {weekdayLabel(date)} <span className="font-semibold text-gray-800 dark:text-gray-200">{date}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{fmtHours(total)}</span>
      </div>

      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {day.windows.map((p) => {
          const style = styleFor(categoryFor(p.category).color)
          const width = (hoursForPeriod(p) / Math.max(total, 0.1)) * 100
          return (
            <div
              key={p.id}
              className={`${style.bg} flex items-center justify-center text-[10px] font-medium text-white/90 ${p.end === null ? 'animate-pulse' : ''}`}
              style={{ width: `${width}%` }}
              title={`${categoryFor(p.category).label} · ${fmtHours(hoursForPeriod(p))}`}
            >
              {width > 12 ? categoryFor(p.category).label : ''}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        <span>{day.location}</span>
        <button type="button" onClick={() => setNoteOpen((v) => !v)} className="underline decoration-dotted">
          {noteOpen ? 'hide note' : 'add note'}
        </button>
      </div>
      {noteOpen && (
        <textarea
          placeholder="What happened today…"
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          rows={2}
        />
      )}
    </div>
  )
}

function SprintInline() {
  const totals = categoryTotals(MOCK_MONTH)
  const pct = Math.min(100, (MOCK_SPRINT_HOURS / SPRINT_TARGET_HOURS) * 100)
  return (
    <div className="my-6 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-5 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">Sprint so far</p>
        <span className="font-mono text-xs text-fuchsia-600 dark:text-fuchsia-400">
          {fmtHours(MOCK_SPRINT_HOURS)} / {SPRINT_TARGET_HOURS}h
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
        <div className="h-full bg-fuchsia-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {totals.map((t) => {
          const cat = categoryFor(t.category)
          const style = styleFor(cat.color)
          return (
            <span
              key={t.category}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${style.bgSoft} ${style.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {cat.label} · {fmtHours(t.hours)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SettingsPopover({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)

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
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30">
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Quick settings"
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <p className="mb-3 text-sm font-semibold text-gray-500">Quick settings</p>
        <div className="space-y-2 text-sm">
          {['Weekday hours: 7.6h', 'Default location: Office', 'Sprint length: 10 days'].map((line) => (
            <div key={line} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              {line}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Done
        </button>
      </div>
    </div>
  )
}

export function VariantC() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const entries = Object.entries(MOCK_MONTH).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="relative mx-auto max-w-xl pb-24">
      <header className="sticky top-0 z-10 -mx-2 mb-2 flex items-center justify-between bg-gray-50/90 px-2 py-3 backdrop-blur dark:bg-gray-900/90">
        <h1 className="text-lg font-semibold">July 2026</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Quick settings"
          className="rounded-full border border-gray-200 p-2 text-gray-400 hover:text-gray-600 dark:border-gray-700"
        >
          ⚙
        </button>
      </header>

      <div>
        {entries.map(([d, day], i) => (
          <div key={d}>
            <DayCard date={d} day={day} />
            {i === 6 && <SprintInline />}
          </div>
        ))}
      </div>

      {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
