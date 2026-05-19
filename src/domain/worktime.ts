import type { WorkWindow } from '../repositories/types'

export type Restarbeitszeit = {
  value: number
  isOvertime: boolean
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function calculateWorkedHours(windows: WorkWindow[]): number {
  return windows.reduce((total, w) => {
    const start = parseMinutes(w.start)
    let end = parseMinutes(w.end)
    if (end <= start) end += 24 * 60 // midnight-spanning
    return total + (end - start) / 60
  }, 0)
}

export function calculateRestarbeitszeit(
  sollstunden: number,
  workedHours: number,
): Restarbeitszeit {
  const value = sollstunden - workedHours
  return { value, isOvertime: value < 0 }
}
