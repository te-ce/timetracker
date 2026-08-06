import type { MonthData, MonthRepository } from '../infra/repositories/types'

export interface MonthEntry {
  ym: string
  data: MonthData
}

/** Every stored month, loaded in one go. */
export async function loadAllMonths(monthRepo: MonthRepository): Promise<MonthEntry[]> {
  const yms = await monthRepo.getAllMonths()
  return Promise.all(
    yms.map(async (ym) => ({
      ym,
      data: await monthRepo.getMonth(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7))),
    })),
  )
}
