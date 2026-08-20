import { buildBadgeLabel, buildReceipt } from '../../shared/remainingCalc'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { Tooltip } from '../../shared/Tooltip'
import { useAppConfig } from '../../shared/useAppConfig'
import { useRemainingHours } from '../../shared/useRemainingHours'

export function RemainingHoursBadge() {
  const config = useAppConfig()
  const { remaining, sollstunden, priorOvertime, workedHours, liveElapsed, isOvertimeReady } = useRemainingHours()
  const timeFormat = useTimeFormatStore((s) => s.format)

  if (!config.showWorkedHoursInNav) return null

  const showTotalWorked = config.showTotalWorked
  const totalWorked = workedHours + liveElapsed
  const remainingTimeMode = config.remainingTimeMode
  // buildReceipt's carry-over line always reflects priorOvertime, in every mode, so the tooltip is
  // unreliable whenever the carry-over is still loading — even in until-daily-target mode, where the
  // badge label itself doesn't depend on it.
  const receiptUnknown = !isOvertimeReady
  const resultUnknown = receiptUnknown && remainingTimeMode !== 'until-daily-target' && !showTotalWorked

  if (resultUnknown) {
    return (
      <span
        aria-hidden="true"
        className="hidden sm:inline-flex h-[1.125rem] w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
      />
    )
  }

  const label = buildBadgeLabel(remaining, totalWorked, timeFormat, showTotalWorked)
  let badgeClass: string
  if (showTotalWorked) {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400'
  } else if (remaining > 0) {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'
  } else {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400'
  }

  const tooltipContent = receiptUnknown ? (
    <div className="text-xs">Loading overtime…</div>
  ) : (
    <div className="space-y-0.5 text-xs">
      {buildReceipt(sollstunden, priorOvertime, workedHours, liveElapsed, remaining, timeFormat, remainingTimeMode).map(
        (line) =>
          line.isTotal ? (
            <div key={line.label} className="flex justify-between gap-4 border-t border-gray-500 pt-0.5 font-semibold">
              <span>{line.label}</span>
              {line.value && <span className="tabular-nums">{line.value}</span>}
            </div>
          ) : line.isSubItem ? (
            <div key={line.label} className="flex justify-between gap-4 pl-3 text-gray-400 dark:text-gray-500">
              <span>{line.label}</span>
              <span className="tabular-nums">{line.value}</span>
            </div>
          ) : (
            <div key={line.label} className="flex justify-between gap-4">
              <span>{line.label}</span>
              <span className="tabular-nums">{line.value}</span>
            </div>
          ),
      )}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <span className={badgeClass}>{label}</span>
    </Tooltip>
  )
}
