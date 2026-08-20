/**
 * How a calendar day's status turns into dots and a name.
 *
 * Shared by MonthCalendar and the DayCell it renders, which live in separate
 * modules so each file declares one component.
 */
import type { DayStatus } from '../../shared/dayStatus'
import { STATUS_DOT, STATUS_LABEL, type DisplayStatus } from '../../shared/statusColors'

export const STATUS_NAME: Record<DayStatus, string> = {
  ...STATUS_LABEL,
  today: 'Today',
}

export function buildDots(status: DayStatus, displayStatus: DisplayStatus | undefined): string[] {
  if (status === 'today') {
    return displayStatus ? [STATUS_DOT[displayStatus]] : []
  }
  return [STATUS_DOT[status]]
}
