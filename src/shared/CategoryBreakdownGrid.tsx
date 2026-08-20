import { Fragment } from 'react'
import type { TimeFormat } from './timeFormatStore'
import { formatHoursCompact } from './formatHours'
import { categoryDisplay } from '../features/day/categoryLabel'

export interface CategoryBreakdownGridProps {
  categoryBreakdown: Record<string, number>
  categoryDescriptions: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary: boolean | undefined
  timeFormat: TimeFormat
  gridCls: string
}

export function CategoryBreakdownGrid({
  categoryBreakdown,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  timeFormat,
  gridCls,
}: CategoryBreakdownGridProps) {
  return (
    <div className={gridCls}>
      {Object.entries(categoryBreakdown).map(([cat, hours]) => {
        const { primary, secondary } = categoryDisplay(
          cat,
          categoryDescriptions ?? {},
          preferCategoryDescriptionAsPrimary ?? false,
        )
        return (
          <Fragment key={cat}>
            <span className="text-right tabular-nums">{formatHoursCompact(hours, timeFormat)}</span>
            <span>
              {primary}
              {secondary ? ` (${secondary})` : ''}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}
