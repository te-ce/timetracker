import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppConfig, ConfigRepository, MonthRepository } from '../../infra/repositories/types'
import { renameCategoryAcrossAllMonths } from '../table/categoryMutations'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'

export function useCategoryMutations(
  config: AppConfig | undefined,
  configRepo: ConfigRepository,
  monthRepo: MonthRepository,
) {
  const queryClient = useQueryClient()

  const setAutoCategory = useMutation({
    mutationFn: (cat: string | null) => configRepo.save({ ...config!, autoCategory: cat }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const reorderCategories = useMutation({
    mutationFn: (categoryOrder: string[]) => configRepo.save({ ...config!, categoryOrder }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const renameCategory = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName, configRepo, monthRepo),
    onSuccess: () => {
      invalidateConfig(queryClient)
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
    onSuccess: () => invalidateConfig(queryClient),
  })

  return { setAutoCategory, reorderCategories, renameCategory, setCategoryDescription }
}
