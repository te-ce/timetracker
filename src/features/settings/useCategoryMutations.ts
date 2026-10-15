import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository, MonthRepository } from '../../infra/repositories/types'
import { renameCategoryAcrossAllMonths } from '../table/categoryMutations'
import { invalidateConfig, invalidateMonthAll } from '../../shared/queryKeys'

export function useCategoryMutations(configRepo: ConfigRepository, monthRepo: MonthRepository) {
  const queryClient = useQueryClient()

  const setAutoCategory = useMutation({
    mutationFn: (cat: string | null) => configRepo.update(() => ({ autoCategory: cat })),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const reorderCategories = useMutation({
    mutationFn: (categoryOrder: string[]) => configRepo.update(() => ({ categoryOrder })),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const renameCategory = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName, configRepo, monthRepo),
    onSuccess: () => {
      invalidateConfig(queryClient)
      invalidateMonthAll(queryClient)
    },
  })

  const setCategoryDescription = useMutation({
    mutationFn: ({ category, description }: { category: string; description: string }) =>
      configRepo.update((latest) => {
        const current = latest.categoryDescriptions ?? {}
        const categoryDescriptions = description
          ? { ...current, [category]: description }
          : Object.fromEntries(Object.entries(current).filter(([k]) => k !== category))
        return { categoryDescriptions }
      }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  return { setAutoCategory, reorderCategories, renameCategory, setCategoryDescription }
}
