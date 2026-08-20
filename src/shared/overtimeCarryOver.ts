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
    const override = manualOverrides.get(month)
    if (override !== undefined) {
      carryOver = override
    }
    carryOver += overtime
  }

  const targetOverride = manualOverrides.get(targetMonth)
  if (targetOverride !== undefined) {
    carryOver = targetOverride
    isManualOverride = true
  }

  return { month: targetMonth, value: carryOver, isManualOverride }
}
