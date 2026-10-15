import { findUnmappedHours } from '../excel/exportPlan'
import { categoryDisplay } from '../day/categoryLabel'
import type { AppConfig } from '../../infra/repositories/types'
import type { UnmappedHoursItem } from './UnmappedHoursBanner'

export function exportBlockedReason(entriesStatus: 'pending' | 'error' | 'success'): string | undefined {
  if (entriesStatus === 'pending') return 'Loading sprint hours…'
  if (entriesStatus === 'error') return 'Could not load sprint hours'
  return undefined
}

export function buildUnmappedItems(
  config: AppConfig | undefined,
  hoursPerCategory: Record<string, number>,
): UnmappedHoursItem[] {
  if (!config) return []
  const descriptions = config.categoryDescriptions ?? {}
  const preferDescription = config.preferCategoryDescriptionAsPrimary ?? false
  return findUnmappedHours(config.categoryMapping ?? {}, hoursPerCategory).map(({ category, hours }) => ({
    label: categoryDisplay(category, descriptions, preferDescription).primary,
    hours,
  }))
}
