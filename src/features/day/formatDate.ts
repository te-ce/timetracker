import { parseLocalDate } from '../../shared/dateUtils'

/** The day heading's date, spelled the way the nav and the view both show it. */
export function formatDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
