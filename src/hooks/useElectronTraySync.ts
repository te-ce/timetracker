import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from './queryKeys'
import { configRepo, timeTrackingRepo } from '../repositories/shared'
import { getAllCategories } from '../domain/categories'
import { toLocalIso } from '../domain/dateUtils'

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
    const today = toLocalIso(new Date())
    await timeTrackingRepo.stop()
    await timeTrackingRepo.start(today, category)
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
  }, [queryClient])

  useEffect(() => {
    if (!window.electronAPI) return
    const listener = (cat: string) => { void handleSetCategory(cat) }
    window.electronAPI.tray.onSetCategory(listener)
    return () => { window.electronAPI!.tray.offSetCategory(listener) }
  }, [handleSetCategory])
}
