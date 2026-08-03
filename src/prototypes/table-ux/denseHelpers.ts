// PROTOTYPE — shared bits for the "everything visible" variants D/E/F. Delete with the directory.
import type { CSSProperties } from 'react'
import { colorForCategory } from './catColors'
import type { ProtoDay } from './protoRows'

export function hoursFor(day: ProtoDay, cat: string): number {
  return day.categories.find((c) => c.cat === cat)?.hours ?? 0
}

/** Per-category max across the month — heat is relative to how big that category ever gets. */
export function categoryMaxima(days: ProtoDay[], categories: string[]): Record<string, number> {
  const max: Record<string, number> = {}
  for (const cat of categories) {
    max[cat] = days.reduce((m, day) => Math.max(m, hoursFor(day, cat)), 0)
  }
  return max
}

export function heatStyle(cat: string, hours: number, max: number, categories: string[]): CSSProperties {
  if (hours <= 0.001 || max <= 0) return {}
  const alpha = 0.1 + 0.42 * Math.min(1, hours / max)
  return { backgroundColor: `rgb(${colorForCategory(cat, categories).rgb} / ${alpha.toFixed(2)})` }
}

export function deltaClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

export function balanceScale(days: ProtoDay[]): number {
  return Math.max(1, ...days.map((d) => Math.abs(d.cumulative ?? 0)))
}

/** Diverging bar behind a running-balance number: zero at the middle of the cell. */
export function balanceBarStyle(value: number, scale: number): CSSProperties {
  const width = (Math.abs(value) / scale) * 50
  const color = value >= 0 ? 'rgb(16 185 129 / 0.35)' : 'rgb(244 63 94 / 0.35)'
  const from = value >= 0 ? 50 : 50 - width
  return {
    background: `linear-gradient(to right, transparent ${from}%, ${color} ${from}%, ${color} ${(from + width).toFixed(2)}%, transparent ${(from + width).toFixed(2)}%)`,
  }
}

/** Bar behind the worked-hours number, full width at the day's target. */
export function workedBarStyle(worked: number, target: number): CSSProperties {
  if (worked <= 0.001) return {}
  const ratio = Math.min(1.25, worked / Math.max(1, target)) / 1.25
  const color = worked >= target ? 'rgb(16 185 129 / 0.28)' : 'rgb(59 130 246 / 0.22)'
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${(ratio * 100).toFixed(2)}%, transparent ${(ratio * 100).toFixed(2)}%)`,
  }
}

export function shortCat(cat: string): string {
  return cat.replace(/^_/, '')
}
