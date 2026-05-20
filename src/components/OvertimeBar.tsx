interface Props {
  overtimeToDate: number
  hoursNeededToday: number
}

export function OvertimeBar({ overtimeToDate, hoursNeededToday }: Props) {
  const isOver = overtimeToDate >= 0
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-gray-50 px-4 py-2 text-sm">
      <span className={`font-semibold ${isOver ? 'text-green-700' : 'text-amber-700'}`}>
        {isOver ? 'Overtime' : 'Undertime'}: {isOver ? '+' : ''}{overtimeToDate.toFixed(2)}h
      </span>
      {hoursNeededToday > 0 && (
        <span className="text-gray-500">
          · Today: {hoursNeededToday.toFixed(2)}h remaining
        </span>
      )}
    </div>
  )
}
