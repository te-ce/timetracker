import type { ConfigRepository, MonthRepository } from '../repositories/types'

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
  for (const ym of allMonths) {
    const year = parseInt(ym.slice(0, 4))
    const month = parseInt(ym.slice(5, 7))
    const data = await monthRepo.getMonth(year, month)
    for (const [date, day] of Object.entries(data)) {
      const needsRename = day.windows.some(
        (w) => w.category === oldName || w.slices.some((s) => s.category === oldName),
      )
      if (needsRename) {
        await monthRepo.updateDay(date, (d) => ({
          ...d,
          windows: d.windows.map((w) => ({
            ...w,
            category: w.category === oldName ? newName : w.category,
            slices: w.slices.map((s) => (s.category === oldName ? { ...s, category: newName } : s)),
          })),
        }))
      }
    }
  }
}
