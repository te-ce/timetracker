import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateActiveTracking, invalidateMonth } from './queryKeys'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { getAllCategories } from './categories'
import { toLocalIso } from './dateUtils'
import { useRemainingHours } from './useRemainingHours'
import { useActiveTracking } from './useActiveTracking'
import { buildTrayState } from './buildTrayState'
import { useTimeFormatStore } from './timeFormatStore'
import { useDayQuery } from '../features/day/useDayQuery'
import type { MonthRepository, WorkPeriod } from '../infra/repositories/types'

export async function handleStartSubtask(
  category: string,
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
): Promise<void> {
  const openPeriod = windows.find((w) => w.end === null)
  if (!openPeriod) return

  // Stop any existing live subtask first
  const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
  if (liveSubtask) {
    await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, new Date().toISOString())
  }

  // Start the new subtask
  const subtaskId = crypto.randomUUID()
  await monthRepo.startLiveSubtask(today, openPeriod.id, {
    id: subtaskId,
    category,
    hours: 0,
    startedAt: new Date().toISOString(),
  })
}

export async function handleStopSubtask(
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
): Promise<void> {
  const openPeriod = windows.find((w) => w.end === null)
  if (!openPeriod) return

  const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
  if (liveSubtask) {
    await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, new Date().toISOString())
  }
}

export async function handleStopAll(
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
  stopTracking: () => Promise<unknown>,
): Promise<void> {
  // Stop live subtask if any
  const openPeriod = windows.find((w) => w.end === null)
  if (openPeriod) {
    const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
    if (liveSubtask) {
      await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, new Date().toISOString())
    }
    const nowHHMM = new Date().toTimeString().slice(0, 5)
    await monthRepo.stopWorkPeriod(today, openPeriod.id, nowHHMM)
  }

  // Stop active tracking session
  await stopTracking()
}

export function useElectronTraySync() {
  const { configRepo, timeTrackingRepo, monthRepo } = useRepositories()
  const queryClient = useQueryClient()
  const { workedHours, sollstunden, priorOvertime, trackingElapsed, liveElapsed } = useRemainingHours()
  const activeTracking = useActiveTracking()
  const timeFormat = useTimeFormatStore((s) => s.format)
  const todayIso = toLocalIso(new Date())
  const { windows, autoCategory: resolvedAutoCategory } = useDayQuery(todayIso)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  useEffect(() => {
    if (!window.electronAPI || !config) return
    const categories = getAllCategories(config.customCategories, config.categoryOrder)

    const trayState = buildTrayState({
      sollstunden,
      priorOvertime,
      workedHours,
      trackingElapsed,
      liveElapsed,
      timeFormat,
      autoCategory: resolvedAutoCategory,
      categories,
      windows,
      isTracking: !!activeTracking,
      startedAt: activeTracking?.startedAt ?? null,
    })

    window.electronAPI.tray.sync(trayState)
  }, [
    config,
    activeTracking,
    workedHours,
    sollstunden,
    priorOvertime,
    trackingElapsed,
    liveElapsed,
    timeFormat,
    windows,
    resolvedAutoCategory,
  ])

  const onStartSubtask = useCallback(
    async (category: string) => {
      await handleStartSubtask(category, monthRepo, todayIso, windows)
      invalidateMonth(queryClient, todayIso)
    },
    [monthRepo, todayIso, windows, queryClient],
  )

  const onStopSubtask = useCallback(async () => {
    await handleStopSubtask(monthRepo, todayIso, windows)
    invalidateMonth(queryClient, todayIso)
  }, [monthRepo, todayIso, windows, queryClient])

  const onStopAll = useCallback(async () => {
    await handleStopAll(monthRepo, todayIso, windows, () => timeTrackingRepo.stop())
    invalidateMonth(queryClient, todayIso)
    await invalidateActiveTracking(queryClient)
  }, [monthRepo, todayIso, windows, timeTrackingRepo, queryClient])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const startListener = (cat: string) => {
      void onStartSubtask(cat)
    }
    const stopListener = () => {
      void onStopSubtask()
    }
    const stopAllListener = () => {
      void onStopAll()
    }
    api.tray.onStartSubtask(startListener)
    api.tray.onStopSubtask(stopListener)
    api.tray.onStopAll(stopAllListener)
    return () => {
      api.tray.offStartSubtask(startListener)
      api.tray.offStopSubtask(stopListener)
      api.tray.offStopAll(stopAllListener)
    }
  }, [onStartSubtask, onStopSubtask, onStopAll])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const listener = () => {
      if (activeTracking) void onStopAll()
    }
    api.hotkey.onToggle(listener)
    return () => {
      api.hotkey.offToggle(listener)
    }
  }, [activeTracking, onStopAll])
}
