import type { CSSProperties } from 'react'

/** Bar behind the worked-hours number, full width at the day's target. */
export function workedBarStyle(worked: number, target: number): CSSProperties {
  if (worked <= 0.001) return {}
  const ratio = Math.min(1.25, worked / Math.max(1, target)) / 1.25
  const color = worked >= target ? 'rgb(16 185 129 / 0.28)' : 'rgb(59 130 246 / 0.22)'
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${(ratio * 100).toFixed(2)}%, transparent ${(ratio * 100).toFixed(2)}%)`,
  }
}

/** Largest absolute running balance across the month — the scale a diverging balance bar is drawn against. */
export function balanceScale(values: (number | null)[]): number {
  return Math.max(1, ...values.map((v) => Math.abs(v ?? 0)))
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
