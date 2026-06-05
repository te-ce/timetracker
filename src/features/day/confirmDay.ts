import type { Day } from '../../infra/repositories/types'

export function buildConfirmedDay(currentDay: Day): Day {
  return { ...currentDay, confirmed: true }
}
