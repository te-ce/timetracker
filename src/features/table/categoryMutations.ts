import type { ConfigRepository, MonthRepository } from '../../infra/repositories/types'

export async function renameCategoryAcrossAllMonths(
  oldName: string,
  newName: string,
  configRepo: ConfigRepository,
  monthRepo: MonthRepository,
): Promise<void> {
  const cfg = await configRepo.get()
  const newCustomCategories = cfg.customCategories.map((c) => (c === oldName ? newName : c))
  const newOrder = (cfg.categoryOrder ?? []).map((c) => (c === oldName ? newName : c))
  const newDescriptions = cfg.categoryDescriptions
    ? Object.fromEntries(Object.entries(cfg.categoryDescriptions).map(([k, v]) => [k === oldName ? newName : k, v]))
    : undefined
  const newMapping = cfg.categoryMapping
    ? Object.fromEntries(Object.entries(cfg.categoryMapping).map(([k, v]) => [k === oldName ? newName : k, v]))
    : undefined
  await configRepo.save({
    ...cfg,
    customCategories: newCustomCategories,
    categoryOrder: newOrder,
    categoryDescriptions: newDescriptions,
    categoryMapping: newMapping,
  })
  const allMonths = await monthRepo.getAllMonths()
  const monthsData = await Promise.all(
    allMonths.map(async (ym) => {
      const year = parseInt(ym.slice(0, 4))
      const month = parseInt(ym.slice(5, 7))
      return monthRepo.getMonth(year, month)
    }),
  )
  const datesToRename: string[] = []
  for (const data of monthsData) {
    for (const [date, day] of Object.entries(data)) {
      const needsRename = day.windows.some(
        (w) => w.category === oldName || w.subtasks.some((s) => s.category === oldName),
      )
      if (needsRename) datesToRename.push(date)
    }
  }
  await Promise.all(
    datesToRename.map((date) =>
      monthRepo.updateDay(date, (d) => ({
        ...d,
        windows: d.windows.map((w) => ({
          ...w,
          category: w.category === oldName ? newName : w.category,
          subtasks: w.subtasks.map((s) => (s.category === oldName ? { ...s, category: newName } : s)),
        })),
      })),
    ),
  )
}
