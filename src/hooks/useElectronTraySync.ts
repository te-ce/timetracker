import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from './queryKeys'
import { configRepo, timeTrackingRepo } from '../repositories/shared'
import { getAllCategories } from '../domain/categories'
import { toLocalIso } from '../domain/dateUtils'
import type { TimeTrackingRepository } from '../repositories/types'

export async function applyCategorySwitch(
  category: string,
  repo: TimeTrackingRepository,
  today: string,
): Promise<void> {
  const current = await repo.getActive()
  if (current?.category === category) {
    await repo.stop()
  } else {
    if (current) await repo.stop()
    await repo.start(today, category)
  }
}

export function useElectronTraySync() {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
    enabled: !!window.electronAPI,
  })

  const { data: activeTracking } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
    enabled: !!window.electronAPI,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!window.electronAPI || !config) return
    const categories = getAllCategories(config.customCategories, config.categoryOrder)
    window.electronAPI.tray.sync({
      activeCategory: activeTracking?.category ?? null,
      categories,
    })
  }, [config, activeTracking])

  const handleSetCategory = useCallback(async (category: string) => {
    await applyCategorySwitch(category, timeTrackingRepo, toLocalIso(new Date()))
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
  }, [queryClient])

  useEffect(() => {
    if (!window.electronAPI) return
    const listener = (cat: string) => { void handleSetCategory(cat) }
    window.electronAPI.tray.onSetCategory(listener)
    return () => { window.electronAPI!.tray.offSetCategory(listener) }
  }, [handleSetCategory])
}
