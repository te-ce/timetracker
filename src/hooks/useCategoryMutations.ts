import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppConfig, MonthRepository } from '../repositories/types'
import type { CloudConfigRepository } from '../repositories/cloud/config-repository'
import { QUERY_KEYS } from './queryKeys'

async function renameCategoryAcrossAllMonths(
  oldName: string,
  newName: string,
  configRepo: CloudConfigRepository,
  monthRepo: MonthRepository,
): Promise<void> {
  const cfg = await configRepo.get()
  const newCustomCategories = cfg.customCategories.map((c) => (c === oldName ? newName : c))
  const newOrder = (cfg.categoryOrder ?? []).map((c) => (c === oldName ? newName : c))
  const newDescriptions = cfg.categoryDescriptions
    ? Object.fromEntries(
        Object.entries(cfg.categoryDescriptions).map(([k, v]) => [k === oldName ? newName : k, v]),
      )
    : undefined
  const newMapping = cfg.categoryMapping
    ? Object.fromEntries(
        Object.entries(cfg.categoryMapping).map(([k, v]) => [k === oldName ? newName : k, v]),
      )
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
      if (day.entries.some((e) => e.category === oldName)) {
        await monthRepo.updateDay(date, (d) => ({
          ...d,
          entries: d.entries.map((e) => (e.category === oldName ? { ...e, category: newName } : e)),
        }))
      }
    }
  }
}

export function useCategoryMutations(
  config: AppConfig | undefined,
  configRepo: CloudConfigRepository,
  monthRepo: MonthRepository,
) {
  const queryClient = useQueryClient()

  const setAutoCategory = useMutation({
    mutationFn: (cat: string | null) => configRepo.save({ ...config!, autoCategory: cat }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const reorderCategories = useMutation({
    mutationFn: (categoryOrder: string[]) => configRepo.save({ ...config!, categoryOrder }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const renameCategory = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName, configRepo, monthRepo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthAll })
    },
  })

  const setCategoryDescription = useMutation({
    mutationFn: ({ category, description }: { category: string; description: string }) => {
      const current = config?.categoryDescriptions ?? {}
      const updated = description
        ? { ...current, [category]: description }
        : Object.fromEntries(Object.entries(current).filter(([k]) => k !== category))
      return configRepo.save({ ...config!, categoryDescriptions: updated })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  return { setAutoCategory, reorderCategories, renameCategory, setCategoryDescription }
}
