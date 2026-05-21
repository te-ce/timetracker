interface Props {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
}

export function OvertimeBar({
  sollstunden,
  priorOvertime,
  workedToday,
  officeDays,
  totalWorkDays,
  officePercent,
}: Props) {
  const hasOvertime = priorOvertime >= 0
  const remaining = sollstunden - priorOvertime - workedToday
  const showOffice = officeDays !== undefined && totalWorkDays !== undefined && officePercent !== undefined

  let remainingLabel: string
  if (remaining > 0) remainingLabel = `${remaining.toFixed(2)}h remaining`
  else if (remaining === 0) remainingLabel = 'Done'
  else remainingLabel = `${Math.abs(remaining).toFixed(2)}h overtime today`

  const summary = `${sollstunden}h target, ${Math.abs(priorOvertime).toFixed(2)}h ${hasOvertime ? 'overtime' : 'undertime'} carry-over, ${workedToday.toFixed(2)}h worked today — ${remainingLabel}`

  return (
    <div
      role="status"
      aria-label={summary}
      className="flex items-center gap-1.5 rounded-lg border bg-gray-50 px-4 py-2 text-sm"
    >
      <span aria-hidden="true" className="font-medium">
        {sollstunden}h
      </span>
      <span aria-hidden="true" className="text-gray-400">
        {hasOvertime ? '−' : '+'}
      </span>
      <span aria-hidden="true" className={`font-medium ${hasOvertime ? 'text-green-700' : 'text-amber-700'}`}>
        {Math.abs(priorOvertime).toFixed(2)}h {hasOvertime ? 'overtime' : 'undertime'}
      </span>
      <span aria-hidden="true" className="text-gray-400">
        −
      </span>
      <span aria-hidden="true" className="font-medium">
        {workedToday.toFixed(2)}h worked
      </span>
      <span aria-hidden="true" className="text-gray-400">
        =
      </span>
      <span aria-hidden="true" className={`font-semibold ${remaining <= 0 ? 'text-green-700' : ''}`}>
        {remainingLabel}
      </span>
      {showOffice && (
        <span aria-hidden="true" className="ml-2 text-gray-400 font-light">
          (<span aria-hidden="true">🏢</span> {officePercent}% · {officeDays}/{totalWorkDays} days)
        </span>
      )}
    </div>
  )
}
