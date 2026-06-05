import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { WorkPeriodPanel } from './WorkPeriodPanel'
import { useTimeFormatStore, type TimeFormat } from '../stores/timeFormatStore'
import { formatHours } from '../domain/formatHours'
import type { WorkPeriod, MonthRepository } from '../repositories/types'

interface Props {
  // Period panel — all three required together to render WorkPeriodPanel
  date?: string
  windows?: WorkPeriod[]
  repository?: MonthRepository
  autoCategory?: string | null
  customCategories?: string[]
  categoryOrder?: string[]
  categoryDescriptions?: Record<string, string>
  // Stats bar — rendered when sollstunden/priorOvertime/workedToday present
  sollstunden?: number
  priorOvertime?: number
  workedToday?: number
  activeTrackingStartedAt?: string | null
  liveWindowStart?: string | null
  nowHHMM?: string
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
}

// ─── Stats bar helpers ────────────────────────────────────────────────────────

function nowHHMMFn() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function minutesFrom(t: string): number {
  const parts = t.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

function liveWindowElapsedHours(start: string, now: string): number {
  let startMins = minutesFrom(start)
  let nowMins = minutesFrom(now)
  if (nowMins < startMins) nowMins += 24 * 60
  return (nowMins - startMins) / 60
}

function useNow(enabled: boolean): string {
  const [now, setNow] = useState(nowHHMMFn)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(nowHHMMFn()), 60_000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

function formatRemaining(remaining: number, fmt: TimeFormat): string {
  if (remaining > 0) return `${formatHours(remaining, fmt)} remaining`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime today`
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function elapsedDecimalHours(startedAt: string): number {
  return (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
}

function useTrackingTick(activeTrackingStartedAt: string | null | undefined) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!activeTrackingStartedAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTrackingStartedAt])
}

function OfficeStatsRow({
  officeDays,
  totalWorkDays,
  officePercent,
}: {
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
}) {
  if (officeDays === undefined || totalWorkDays === undefined || officePercent === undefined) return null
  return (
    <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
      <span aria-hidden="true">🏢</span>
      <span>{officePercent}% office</span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <span>
        {officeDays}/{totalWorkDays} days
      </span>
    </div>
  )
}

function TrackingBadge({ startedAt }: { startedAt: string }) {
  return (
    <>
      <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
        −
      </span>
      <Link
        to="/day"
        search={{ date: startedAt.slice(0, 10) }}
        aria-hidden="true"
        className="font-medium text-green-700 dark:text-green-400 tabular-nums hover:underline"
      >
        {formatElapsed(startedAt)} tracking
      </Link>
    </>
  )
}

function LiveWindowBadge({ elapsed, fmt }: { elapsed: number; fmt: TimeFormat }) {
  return (
    <>
      <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
        −
      </span>
      <span className="font-medium text-green-700 dark:text-green-400 tabular-nums" aria-hidden="true">
        {formatHours(elapsed, fmt)} current
      </span>
    </>
  )
}

interface BarData {
  remainingLabel: string
  overtimeLabel: string
  overtimeSign: string
  overtimeClass: string
  summary: string
  resultClass: string
}

function buildBarData(
  sollstunden: number,
  priorOvertime: number,
  workedToday: number,
  trackingElapsed: number,
  liveElapsed: number,
  fmt: TimeFormat,
  activeTrackingStartedAt: string | null | undefined,
  liveWindowStart: string | null | undefined,
): BarData {
  const hasOvertime = priorOvertime >= 0
  const remaining = sollstunden - priorOvertime - workedToday - trackingElapsed - liveElapsed
  const remainingLabel = formatRemaining(remaining, fmt)
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
  const trackingPart = activeTrackingStartedAt ? `, ${formatElapsed(activeTrackingStartedAt)} tracking` : ''
  const currentPart = liveWindowStart ? `, ${formatHours(liveElapsed, fmt)} current` : ''
  const summary = `${formatHours(sollstunden, fmt)} target, ${formatHours(Math.abs(priorOvertime), fmt)} ${overtimeLabel} carry-over, ${formatHours(workedToday, fmt)} worked today${trackingPart}${currentPart} — ${remainingLabel}`
  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
  return { remainingLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass }
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  activeTrackingStartedAt?: string | null
  liveWindowStart?: string | null
  nowHHMM?: string
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
}

function StatsBar({
  sollstunden,
  priorOvertime,
  workedToday,
  activeTrackingStartedAt,
  liveWindowStart,
  nowHHMM: nowHHMMProp,
  officeDays,
  totalWorkDays,
  officePercent,
}: StatsBarProps) {
  useTrackingTick(activeTrackingStartedAt)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const internalNow = useNow(!!liveWindowStart && !nowHHMMProp)
  const nowHHMM = nowHHMMProp ?? internalNow
  const trackingElapsed = activeTrackingStartedAt ? elapsedDecimalHours(activeTrackingStartedAt) : 0
  const liveElapsed = liveWindowStart ? liveWindowElapsedHours(liveWindowStart, nowHHMM) : 0
  const { remainingLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass } = buildBarData(
    sollstunden,
    priorOvertime,
    workedToday,
    trackingElapsed,
    liveElapsed,
    timeFormat,
    activeTrackingStartedAt,
    liveWindowStart,
  )

  return (
    <div
      role="status"
      aria-label={summary}
      className="rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        >
          <span className="font-medium text-gray-700 dark:text-gray-200">{formatHours(sollstunden, timeFormat)}</span>
          <span>target</span>
          <span className="text-gray-300 dark:text-gray-600">{overtimeSign}</span>
          <span className={`font-medium ${overtimeClass}`}>
            {formatHours(Math.abs(priorOvertime), timeFormat)} {overtimeLabel}
          </span>
          <span className="text-gray-300 dark:text-gray-600">−</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatHours(workedToday, timeFormat)} worked
          </span>
          {liveWindowStart && <LiveWindowBadge elapsed={liveElapsed} fmt={timeFormat} />}
          {activeTrackingStartedAt && <TrackingBadge startedAt={activeTrackingStartedAt} />}
        </div>
        <span className={`text-lg font-bold tabular-nums shrink-0 ${resultClass}`} aria-hidden="true">
          {remainingLabel}
        </span>
      </div>
      <OfficeStatsRow officeDays={officeDays} totalWorkDays={totalWorkDays} officePercent={officePercent} />
    </div>
  )
}

// ─── WorkOverview ─────────────────────────────────────────────────────────────

interface StatsProps {
  sollstunden: number
  priorOvertime: number
  workedToday: number
}
interface PanelProps {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
}

function resolveStats(p: Props): StatsProps | null {
  if (p.sollstunden === undefined || p.priorOvertime === undefined || p.workedToday === undefined) return null
  return { sollstunden: p.sollstunden, priorOvertime: p.priorOvertime, workedToday: p.workedToday }
}

function resolvePanelProps(p: Props): PanelProps | null {
  if (p.date === undefined || p.windows === undefined || p.repository === undefined) return null
  return { date: p.date, windows: p.windows, repository: p.repository }
}

export function WorkOverview(props: Props) {
  const stats = resolveStats(props)
  const panel = resolvePanelProps(props)
  const liveWindowStart = props.liveWindowStart ?? props.windows?.find((w) => w.end === null)?.start ?? null

  return (
    <div className="flex flex-col gap-4">
      {stats && (
        <StatsBar
          {...stats}
          activeTrackingStartedAt={props.activeTrackingStartedAt}
          liveWindowStart={liveWindowStart}
          nowHHMM={props.nowHHMM}
          officeDays={props.officeDays}
          totalWorkDays={props.totalWorkDays}
          officePercent={props.officePercent}
        />
      )}
      {panel && (
        <WorkPeriodPanel
          date={panel.date}
          windows={panel.windows}
          repository={panel.repository}
          autoCategory={props.autoCategory ?? null}
          customCategories={props.customCategories}
          categoryOrder={props.categoryOrder}
          categoryDescriptions={props.categoryDescriptions}
        />
      )}
    </div>
  )
}
