interface Props {
  sollstunden: number
  overtimeToDate: number
  hoursNeededToday: number
}

export function OvertimeBar({ sollstunden, overtimeToDate, hoursNeededToday }: Props) {
  const isAhead = overtimeToDate >= 0
  return (
    <div className="flex items-center gap-1.5 rounded-lg border bg-gray-50 px-4 py-2 text-sm">
      <span className="font-medium">{sollstunden}h</span>
      <span className="text-gray-400">{isAhead ? '−' : '+'}</span>
      <span className={`font-medium ${isAhead ? 'text-green-700' : 'text-amber-700'}`}>
        {Math.abs(overtimeToDate).toFixed(2)}h {isAhead ? 'overtime' : 'undertime'}
      </span>
      <span className="text-gray-400">=</span>
      <span className="font-semibold">{hoursNeededToday.toFixed(2)}h needed today</span>
    </div>
  )
}
