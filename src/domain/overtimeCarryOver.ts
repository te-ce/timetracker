export interface OvertimeCarryOver {
  month: string
  value: number
  isManualOverride: boolean
}

export interface OvertimeCarryOverInput {
  initialOvertime: number
  monthlyOvertimes: { month: string; overtime: number }[]
  manualOverrides: Map<string, number>
  targetMonth: string
}

export function calculateOvertimeCarryOver(input: OvertimeCarryOverInput): OvertimeCarryOver {
  const { initialOvertime, monthlyOvertimes, manualOverrides, targetMonth } = input

  // Only include months strictly before the target
  const relevant = monthlyOvertimes.filter((m) => m.month < targetMonth).sort((a, b) => a.month.localeCompare(b.month))

  let carryOver = initialOvertime
  let isManualOverride = false

  for (const { month, overtime } of relevant) {
    if (manualOverrides.has(month)) {
      carryOver = manualOverrides.get(month)!
    }
    carryOver += overtime
  }

  if (manualOverrides.has(targetMonth)) {
    carryOver = manualOverrides.get(targetMonth)!
    isManualOverride = true
  }

  return { month: targetMonth, value: carryOver, isManualOverride }
}
