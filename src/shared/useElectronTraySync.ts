import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateMonth } from './queryKeys'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { getAllCategories } from './categories'
import { toLocalIso } from './dateUtils'
import { useRemainingHours } from './useRemainingHours'
import { buildTrayState } from './buildTrayState'
import { useTimeFormatStore } from './timeFormatStore'
import { useDayQuery } from '../features/day/useDayQuery'
import type { MonthRepository, WorkPeriod } from '../infra/repositories/types'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
  const openPeriod = windows.find((w) => w.end === null)
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
  const openPeriod = windows.find((w) => w.end === null)
  if (!openPeriod) return

  const liveSubtask = openPeriod.subtasks.find((s) => s.startedAt && !s.stoppedAt)
  if (liveSubtask) {
    await monthRepo.stopLiveSubtask(today, openPeriod.id, liveSubtask.id, nowHHMM())
  }
}

export async function handleStopAll(monthRepo: MonthRepository, today: string, windows: WorkPeriod[]): Promise<void> {
  const now = nowHHMM()

  // Stop live subtask if any
  const openPeriod = windows.find((w) => w.end === null)
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
  const { workedHours, sollstunden, priorOvertime, liveElapsed } = useRemainingHours()
  const timeFormat = useTimeFormatStore((s) => s.format)
  const todayIso = toLocalIso(new Date())
  const { windows, autoCategory: resolvedAutoCategory } = useDayQuery(todayIso)

  const openPeriod = windows.find((w) => w.end === null)
  const isTracking = !!openPeriod
  const startedAt = openPeriodToISOStart(openPeriod, todayIso)

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
      liveElapsed,
      timeFormat,
      autoCategory: resolvedAutoCategory,
      categories,
      windows,
      isTracking,
      startedAt,
      remainingTimeMode: config.remainingTimeMode ?? 'until-zero-overtime',
      showTotalWorked: config.showTotalWorked === true,
    })

    if (config.showWorkedHoursInTray === false) {
      trayState.receiptLines = []
    }

    window.electronAPI.tray.sync(trayState)
  }, [
    config,
    isTracking,
    startedAt,
    workedHours,
    sollstunden,
    priorOvertime,
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
}
