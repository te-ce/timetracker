import { LEAVE_TYPE_LABEL } from '../../shared/leaveTypeLabel'
import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { balanceInk, formatSignedHours } from './monthBalanceFormat'
import type { MonthOverviewDay } from './monthOverview'

export function DayLedger({
  ledger,
  showBar,
  timeFormat,
}: {
  ledger: MonthOverviewDay
  showBar: boolean
  timeFormat: TimeFormat
}) {
  return (
    <span className="block">
      {ledger.leaveType && ledger.workedHours === 0 ? (
        <span className="block text-xs font-medium leading-none">{LEAVE_TYPE_LABEL[ledger.leaveType]}</span>
      ) : (
        <span className="block text-base font-semibold leading-none tabular-nums">
          {ledger.workedHours > 0 ? formatHours(ledger.workedHours, timeFormat) : ''}
        </span>
      )}
      {showBar && ledger.targetHours > 0 && (
        <span className="mt-1 block h-1 w-full rounded-full bg-black/10 dark:bg-white/10">
          <span
            className="block h-1 rounded-full bg-indigo-500"
            style={{ width: `${ledger.fillPercent}%` }}
            aria-hidden="true"
          />
        </span>
      )}
      {ledger.overtimeToDate !== null && (
        <span className={`mt-0.5 block text-[10px] leading-none tabular-nums ${balanceInk(ledger.overtimeToDate)}`}>
          {formatSignedHours(ledger.overtimeToDate, timeFormat)}
        </span>
      )}
    </span>
  )
}
