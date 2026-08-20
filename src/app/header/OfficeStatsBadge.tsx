import { Tooltip } from '../../shared/Tooltip'
import { useAppConfig } from '../../shared/useAppConfig'
import { useRemainingHours } from '../../shared/useRemainingHours'

export function OfficeStatsBadge() {
  const config = useAppConfig()
  const { officeDays, totalWorkDays, officePercent } = useRemainingHours()
  if (!config.officeStats) return null
  if (totalWorkDays === 0) return null
  const tooltipContent = `${officeDays}/${totalWorkDays} days in office this month`
  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <span className="hidden sm:inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        🏢 {officePercent}%
      </span>
    </Tooltip>
  )
}
