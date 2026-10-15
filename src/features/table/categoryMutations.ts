import { getAllCategories, isValidCustomCategoryName } from '../../shared/categories'
import type { AppConfig, ConfigRepository, Day, MonthRepository } from '../../infra/repositories/types'

function renameKeys<T>(record: Record<string, T> | undefined, oldName: string, newName: string) {
  if (!record) return undefined
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k === oldName ? newName : k, v]))
}

function renameInConfig(cfg: AppConfig, oldName: string, newName: string): AppConfig {
  const swap = (c: string) => (c === oldName ? newName : c)
  return {
    ...cfg,
    customCategories: cfg.customCategories.map(swap),
    categoryOrder: (cfg.categoryOrder ?? []).map(swap),
    categoryDescriptions: renameKeys(cfg.categoryDescriptions, oldName, newName),
    categoryMapping: renameKeys(cfg.categoryMapping, oldName, newName),
    autoCategory: cfg.autoCategory === oldName ? newName : cfg.autoCategory,
  }
}

function referencesCategory(day: Day, name: string): boolean {
  return (
    day.autoCategoryOverride === name ||
    day.windows.some((w) => w.category === name || w.subtasks.some((s) => s.category === name))
  )
}

function renameInDay(d: Day, oldName: string, newName: string): Day {
  return {
    ...d,
    ...(d.autoCategoryOverride === oldName ? { autoCategoryOverride: newName } : {}),
    windows: d.windows.map((w) => ({
      ...w,
      category: w.category === oldName ? newName : w.category,
      subtasks: w.subtasks.map((s) => (s.category === oldName ? { ...s, category: newName } : s)),
    })),
  }
}

export async function renameCategoryAcrossAllMonths(
  oldName: string,
  newName: string,
  configRepo: ConfigRepository,
  monthRepo: MonthRepository,
): Promise<void> {
  const cfg = await configRepo.get()
  if (!isValidCustomCategoryName(oldName) || !isValidCustomCategoryName(newName)) return
  if (getAllCategories(cfg.customCategories).includes(newName)) return
  await configRepo.save(renameInConfig(cfg, oldName, newName))
  const allMonths = await monthRepo.getAllMonths()
  const monthsData = await Promise.all(
    allMonths.map((ym) => monthRepo.getMonth(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7)))),
  )
  const datesToRename = monthsData.flatMap((data) =>
    Object.entries(data)
      .filter(([, day]) => referencesCategory(day, oldName))
      .map(([date]) => date),
  )
  await Promise.all(datesToRename.map((date) => monthRepo.updateDay(date, (d) => renameInDay(d, oldName, newName))))
}
