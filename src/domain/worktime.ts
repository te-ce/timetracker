import type { WorkPeriod } from '../repositories/types'

export type Restarbeitszeit = {
  value: number
  isOvertime: boolean
}

function parseMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return h * 60 + m
}

export function calculateWorkedHours(windows: WorkPeriod[], now?: string): number {
  return windows.reduce((total, w) => {
    const endTime = w.end ?? now
    if (endTime == null) return total
    const start = parseMinutes(w.start)
    let end = parseMinutes(endTime)
    if (end < start) end += 24 * 60 // midnight-spanning
    return total + (end - start) / 60
  }, 0)
}

export function calculateRestarbeitszeit(sollstunden: number, workedHours: number): Restarbeitszeit {
  const value = sollstunden - workedHours
  return { value, isOvertime: value < 0 }
}
