import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateActiveTracking } from './queryKeys'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { getAllCategories } from './categories'
import { toLocalIso } from './dateUtils'
import { useRemainingHours } from './useRemainingHours'
import type { TimeTrackingRepository } from '../infra/repositories/types'

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
  const { configRepo, timeTrackingRepo } = useRepositories()
  const queryClient = useQueryClient()
  const { workedHours, remaining, sollstunden, priorOvertime } = useRemainingHours()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: activeTracking } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!window.electronAPI || !config) return
    const categories = getAllCategories(config.customCategories, config.categoryOrder)
    window.electronAPI.tray.sync({
      activeCategory: activeTracking?.category ?? null,
      categories,
      startedAt: activeTracking?.startedAt ?? null,
      workedHours,
      remaining,
      sollstunden,
      priorOvertime,
    })
  }, [config, activeTracking, workedHours, remaining, sollstunden, priorOvertime])

  const handleSetCategory = useCallback(
    async (category: string) => {
      await applyCategorySwitch(category, timeTrackingRepo, toLocalIso(new Date()))
      await invalidateActiveTracking(queryClient)
    },
    [queryClient, timeTrackingRepo],
  )

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const listener = (cat: string) => {
      void handleSetCategory(cat)
    }
    api.tray.onSetCategory(listener)
    return () => {
      api.tray.offSetCategory(listener)
    }
  }, [handleSetCategory])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const listener = () => {
      if (activeTracking) void handleSetCategory(activeTracking.category)
    }
    api.hotkey.onToggle(listener)
    return () => {
      api.hotkey.offToggle(listener)
    }
  }, [activeTracking, handleSetCategory])
}
