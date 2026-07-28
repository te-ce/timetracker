// PROTOTYPE — Variant B: persistent sidebar shell, dashboard-first, classic SaaS structure.
import { useState } from 'react'
import {
  MOCK_MONTH,
  TODAY_ISO,
  categoryFor,
  categoryTotals,
  dayTotalHours,
  SPRINT_TARGET_HOURS,
  MOCK_SPRINT_HOURS,
} from './mockData'
import { styleFor } from './categoryStyles'

type Tab = 'overview' | 'calendar' | 'sprint' | 'settings'

function fmtHours(h: number): string {
  return `${h.toFixed(1)}h`
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function Overview() {
  const today = MOCK_MONTH[TODAY_ISO] ?? { windows: [] }
  const totals = categoryTotals(MOCK_MONTH)
  const officeDays = Object.values(MOCK_MONTH).filter((d) => d.location === 'Office').length
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value={fmtHours(dayTotalHours(today))} sub={today.location} />
        <StatCard label="Sprint total" value={fmtHours(MOCK_SPRINT_HOURS)} sub={`of ${SPRINT_TARGET_HOURS}h target`} />
        <StatCard
          label="Overtime"
          value={`${MOCK_SPRINT_HOURS - SPRINT_TARGET_HOURS >= 0 ? '+' : ''}${(MOCK_SPRINT_HOURS - SPRINT_TARGET_HOURS).toFixed(1)}h`}
        />
        <StatCard label="Office days" value={`${officeDays}`} sub="this period" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-500">Category breakdown</h2>
        <div className="space-y-3">
          {totals.map((t) => {
            const cat = categoryFor(t.category)
            const style = styleFor(cat.color)
            const max = totals[0]?.hours || 1
            return (
              <div key={t.category} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <span className="w-40 text-sm">{cat.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={`h-full ${style.bg}`} style={{ width: `${(t.hours / max) * 100}%` }} />
                </div>
                <span className="w-14 text-right font-mono text-xs text-gray-400">{fmtHours(t.hours)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CalendarGrid() {
  const entries = Object.entries(MOCK_MONTH).sort(([a], [b]) => a.localeCompare(b))
  const firstDow = new Date(entries[0]?.[0] ?? TODAY_ISO).getDay()
  const leadingBlanks = (firstDow + 6) % 7 // week starts Monday
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-500">July 2026</h2>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-400">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {entries.map(([d, day]) => {
          const total = dayTotalHours(day)
          return (
            <div
              key={d}
              className={`flex h-16 flex-col justify-between rounded-lg border p-1.5 text-left text-xs ${
                d === TODAY_ISO
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <span className="font-medium text-gray-500">{Number(d.slice(-2))}</span>
              {day.dayTypeOverride ? (
                <span className="text-[10px] text-gray-400">{day.dayTypeOverride}</span>
              ) : (
                <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300">{fmtHours(total)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SprintPanel() {
  const totals = categoryTotals(MOCK_MONTH)
  const pct = Math.min(100, (MOCK_SPRINT_HOURS / SPRINT_TARGET_HOURS) * 100)
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">Sprint 14 progress</h2>
          <span className="font-mono text-sm text-gray-400">
            {fmtHours(MOCK_SPRINT_HOURS)} / {SPRINT_TARGET_HOURS}h
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Export to Excel</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 dark:border-gray-800">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 text-right font-medium">Hours</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.category} className="border-b border-gray-50 dark:border-gray-800/60">
                <td className="py-1.5">{categoryFor(t.category).label}</td>
                <td className="py-1.5 text-right font-mono">{fmtHours(t.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Export sprint sheet
        </button>
      </div>
    </div>
  )
}

function SettingsPanel() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-500">Preferences</h2>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {['Weekday hours', 'Default location', 'Sprint length', 'Hotkeys', 'Startup view'].map((label) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span>{label}</span>
            <span className="text-gray-400">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '◆' },
  { key: 'calendar', label: 'Calendar', icon: '▦' },
  { key: 'sprint', label: 'Sprint', icon: '◗' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

export function VariantB() {
  const [tab, setTab] = useState<Tab>('overview')
  const today = MOCK_MONTH[TODAY_ISO] ?? { windows: [] }

  return (
    <div className="flex min-h-[600px] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
        <p className="mb-6 px-2 text-lg font-bold">Timetracker</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === item.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="font-medium text-gray-500">Today</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{fmtHours(dayTotalHours(today))}</p>
          <p className="text-gray-400">
            {today.windows.filter((p) => p.end === null).length > 0 ? 'Tracking live…' : 'Confirmed'}
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 dark:bg-gray-900/40">
        {tab === 'overview' && <Overview />}
        {tab === 'calendar' && <CalendarGrid />}
        {tab === 'sprint' && <SprintPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}
