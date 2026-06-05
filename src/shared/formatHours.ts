import type { TimeFormat } from './timeFormatStore'

export function formatHours(h: number, format: TimeFormat): string {
  if (format === 'hhmm') {
    const sign = h < 0 ? '-' : ''
    const totalMin = Math.round(Math.abs(h) * 60)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    return `${sign}${hours}:${String(mins).padStart(2, '0')}`
  }
  return `${h.toFixed(2)}h`
}

export function formatHoursCompact(h: number, format: TimeFormat): string {
  if (format === 'hhmm') {
    return formatHours(h, format)
  }
  return h.toFixed(2)
}
