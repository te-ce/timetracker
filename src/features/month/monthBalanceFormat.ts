import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'

/** Rounding noise below this reads as "balanced" rather than a signed near-zero. */
const BALANCED_EPSILON = 0.005

/** Over/undertime with an explicit sign, e.g. "+1:30" / "−0:45"; unsigned when balanced. */
export function formatSignedHours(hours: number, format: TimeFormat): string {
  if (Math.abs(hours) < BALANCED_EPSILON) return formatHours(0, format)
  return `${hours > 0 ? '+' : '−'}${formatHours(Math.abs(hours), format)}`
}

export function balanceInk(balance: number): string {
  if (Math.abs(balance) < BALANCED_EPSILON) return 'text-gray-500 dark:text-gray-400'
  return balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
}
