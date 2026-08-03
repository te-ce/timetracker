import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { resolveAppConfig } from './appConfigDefaults'
import { QUERY_KEYS, invalidateMonth, invalidateConfig } from './queryKeys'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { getAllCategories } from './categories'
import { useTodayIso } from './useTodayIso'
import { useRemainingHours } from './useRemainingHours'
import { buildTrayState } from './buildTrayState'
import { useTimeFormatStore } from './timeFormatStore'
import { useDayQuery } from '../features/day/useDayQuery'
import { findActivePeriod, nowHHMM } from './worktime'
import type { MonthRepository, WorkPeriod } from '../infra/repositories/types'

function openPeriodToISOStart(period: WorkPeriod | undefined, todayIso: string): string | null {
  if (!period) return null
  const parts = period.start.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const d = new Date(todayIso)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export async function handleStartWorkPeriod(
  category: string,
  monthRepo: MonthRepository,
  today: string,
): Promise<void> {
  await monthRepo.openWorkPeriod(today, category, nowHHMM())
}

export async function handleStartSubtask(
  category: string,
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
): Promise<void> {
  const openPeriod = findActivePeriod(windows, nowHHMM())
  if (!openPeriod) return

  const now = nowHHMM()

  // startLiveSubtask already settles any existing live subtask atomically
  // (using the new subtask's startedAt as the stop time), so no need to
  // call stopLiveSubtask separately.
  const subtaskId = crypto.randomUUID()
  await monthRepo.startLiveSubtask(today, openPeriod.id, {
    id: subtaskId,
    category,
    hours: 0,
    startedAt: now,
  })
}

export async function handleStopSubtask(
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
): Promise<void> {
  const openPeriod = findActivePeriod(windows, nowHHMM())
  if (!openPeriod) return

  const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
  if (liveSubtask) {
    await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, nowHHMM())
  }
}

export async function handleStopAll(monthRepo: MonthRepository, today: string, windows: WorkPeriod[]): Promise<void> {
  const now = nowHHMM()

  // Stop live subtask if any
  const openPeriod = findActivePeriod(windows, now)
  if (openPeriod) {
    const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
    if (liveSubtask) {
      await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, now)
    }
    await monthRepo.stopWorkPeriod(today, openPeriod.id, now)
  }
}

export function useElectronTraySync() {
  const { configRepo, monthRepo } = useRepositories()
  const queryClient = useQueryClient()
  const { workedHours, sollstunden, priorOvertime, liveElapsed, remaining, isOvertimeReady } = useRemainingHours()
  const timeFormat = useTimeFormatStore((s) => s.format)
  const todayIso = useTodayIso()
  const { windows, autoCategory: resolvedAutoCategory } = useDayQuery(todayIso)

  const openPeriod = findActivePeriod(windows, nowHHMM())
  const isTracking = !!openPeriod
  const startedAt = openPeriodToISOStart(openPeriod, todayIso)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const toggleShowWorkedHoursInTray = useMutation({
    mutationFn: () =>
      configRepo.save({ ...config!, showWorkedHoursInTray: !resolveAppConfig(config).showWorkedHoursInTray }),
    onSuccess: () => invalidateConfig(queryClient),
  })
  const toggleHoursDisplay = useCallback(() => {
    if (config) toggleShowWorkedHoursInTray.mutate()
  }, [config, toggleShowWorkedHoursInTray])

  const hideHours = !resolveAppConfig(config).showWorkedHoursInTray

  useEffect(() => {
    if (!window.electronAPI || !config) return
    const resolved = resolveAppConfig(config)
    const categories = getAllCategories(resolved.customCategories, resolved.categoryOrder)

    const trayState = buildTrayState({
      sollstunden,
      priorOvertime,
      workedHours,
      liveElapsed,
      remaining,
      timeFormat,
      autoCategory: resolvedAutoCategory,
      categories,
      windows,
      isTracking,
      startedAt,
      nowHHMM: nowHHMM(),
      remainingTimeMode: resolved.remainingTimeMode,
      showTotalWorked: resolved.showTotalWorked,
      presentingMode: hideHours,
      isOvertimeReady,
    })

    window.electronAPI.tray.sync(trayState)
  }, [
    config,
    isTracking,
    startedAt,
    workedHours,
    sollstunden,
    priorOvertime,
    liveElapsed,
    remaining,
    timeFormat,
    windows,
    resolvedAutoCategory,
    hideHours,
    isOvertimeReady,
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
    await handleStopAll(monthRepo, todayIso, windows)
    invalidateMonth(queryClient, todayIso)
  }, [monthRepo, todayIso, windows, queryClient])

  const onStartWorkPeriod = useCallback(
    async (category: string) => {
      await handleStartWorkPeriod(category, monthRepo, todayIso)
      invalidateMonth(queryClient, todayIso)
    },
    [monthRepo, todayIso, queryClient],
  )

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
    const startWorkPeriodListener = (cat: string) => {
      void onStartWorkPeriod(cat)
    }
    api.tray.onStartSubtask(startListener)
    api.tray.onStopSubtask(stopListener)
    api.tray.onStopAll(stopAllListener)
    api.tray.onStartWorkPeriod(startWorkPeriodListener)
    return () => {
      api.tray.offStartSubtask(startListener)
      api.tray.offStopSubtask(stopListener)
      api.tray.offStopAll(stopAllListener)
      api.tray.offStartWorkPeriod(startWorkPeriodListener)
    }
  }, [onStartSubtask, onStopSubtask, onStopAll, onStartWorkPeriod])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const listener = () => {
      if (isTracking) void onStopAll()
    }
    api.hotkey.onToggle(listener)
    return () => {
      api.hotkey.offToggle(listener)
    }
  }, [isTracking, onStopAll])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.tray.onTogglePresentingMode(toggleHoursDisplay)
    api.hotkey.onTogglePresenting(toggleHoursDisplay)
    return () => {
      api.tray.offTogglePresentingMode(toggleHoursDisplay)
      api.hotkey.offTogglePresenting(toggleHoursDisplay)
    }
  }, [toggleHoursDisplay])
}
