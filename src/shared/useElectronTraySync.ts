import { useEffect, useCallback, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { resolveAppConfig } from './appConfigDefaults'
import { QUERY_KEYS, invalidateMonth, invalidateConfig } from './queryKeys'
import { useRepositories } from '../infra/repositories/repositories-context'
import { getAllCategories } from './categories'
import { useTodayIso } from './useTodayIso'
import { parseLocalDate, toLocalIso } from './dateUtils'
import { useRemainingHours } from './useRemainingHours'
import { buildTrayState } from './buildTrayState'
import { useTimeFormatStore } from './timeFormatStore'
import { useDayQuery } from '../features/day/useDayQuery'
import { findActivePeriod, findOpenPeriod, nowHHMM } from './worktime'
import { useSprintExportReminder } from '../features/sprint/useSprintExportReminder'
import { requestSprintEndReminder } from './sprintEndReminderStore'
import type { MonthRepository, WorkPeriod } from '../infra/repositories/types'

function openPeriodToISOStart(period: WorkPeriod | undefined, todayIso: string): string | null {
  if (!period) return null
  const parts = period.start.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const d = parseLocalDate(todayIso)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// Tray actions resolve the day at click time and read it from the repository:
// the hook's render-time todayIso and windows can still be yesterday's after sleep.
async function readToday(monthRepo: MonthRepository): Promise<{ today: string; windows: WorkPeriod[] }> {
  const today = toLocalIso(new Date())
  const month = await monthRepo.getMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)))
  return { today, windows: month[today]?.windows ?? [] }
}

// Resolves the day at click time: todayIso from useTodayIso can lag behind
// midnight while the window stays hidden (its timer doesn't run during sleep).
export async function handleStartWorkPeriod(category: string, monthRepo: MonthRepository): Promise<string> {
  const today = toLocalIso(new Date())
  await monthRepo.openWorkPeriod(today, category, nowHHMM())
  return today
}

export async function handleStartSubtask(
  category: string,
  monthRepo: MonthRepository,
  today: string,
  windows: WorkPeriod[],
): Promise<void> {
  // Only a truly open period: a subtask started inside a Planned-Stop keeps
  // running after the planned end, where neither the day view nor the tray can stop it.
  const openPeriod = findOpenPeriod(windows)
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
  // Stop All only fills empty stop fields. A period that already carries a
  // stop time — including a Planned-Stop one still counting down — keeps the
  // time the user set; overwriting it would silently destroy their input.
  const targets = windows.filter((p) => p.end === null)

  for (const period of targets) {
    const liveSubtask = period.subtasks.find((s) => s.startedAt && !s.stoppedAt)
    if (liveSubtask) {
      await monthRepo.stopLiveSubtask(today, period.id, liveSubtask.id, now)
    }
    await monthRepo.stopWorkPeriod(today, period.id, now)
  }
}

export function useElectronTraySync(): { isTracking: boolean; isOvertime: boolean } {
  const { configRepo, monthRepo } = useRepositories()
  const queryClient = useQueryClient()
  const { workedHours, sollstunden, priorOvertime, liveElapsed, remaining, isOvertimeReady } = useRemainingHours()
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [, setTick] = useState(0)
  const todayIso = useTodayIso()
  const { windows, autoCategory: resolvedAutoCategory } = useDayQuery(todayIso)
  const sprintBadgeState = useSprintExportReminder()
  const needsSprintExport = sprintBadgeState?.kind === 'export'

  const openPeriod = findActivePeriod(windows, nowHHMM())
  const isTracking = !!openPeriod
  const startedAt = openPeriodToISOStart(openPeriod, todayIso)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const toggleShowWorkedHoursInTray = useMutation({
    mutationFn: () =>
      configRepo.update((latest) => ({
        showWorkedHoursInTray: !resolveAppConfig(latest).showWorkedHoursInTray,
      })),
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
      showWorkedHoursInTrayBreakdown: resolved.showWorkedHoursInTrayBreakdown,
      presentingMode: hideHours,
      isOvertimeReady,
      categoryDescriptions: resolved.categoryDescriptions,
      preferCategoryDescriptionAsPrimary: resolved.preferCategoryDescriptionAsPrimary,
      needsSprintExport,
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
    needsSprintExport,
  ])

  const onStartSubtask = useCallback(
    async (category: string) => {
      const { today, windows } = await readToday(monthRepo)
      await handleStartSubtask(category, monthRepo, today, windows)
      invalidateMonth(queryClient, today)
    },
    [monthRepo, queryClient],
  )

  const onStopSubtask = useCallback(async () => {
    const { today, windows } = await readToday(monthRepo)
    await handleStopSubtask(monthRepo, today, windows)
    invalidateMonth(queryClient, today)
  }, [monthRepo, queryClient])

  const onStopAll = useCallback(async () => {
    const { today, windows } = await readToday(monthRepo)
    await handleStopAll(monthRepo, today, windows)
    invalidateMonth(queryClient, today)
    invalidateMonth(queryClient, todayIso)
    requestSprintEndReminder()
  }, [monthRepo, todayIso, queryClient])

  const onStartWorkPeriod = useCallback(
    async (category: string) => {
      const today = await handleStartWorkPeriod(category, monthRepo)
      invalidateMonth(queryClient, today)
    },
    [monthRepo, queryClient],
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
    const unsubscribes = [
      api.tray.onStartSubtask(startListener),
      api.tray.onStopSubtask(stopListener),
      api.tray.onStopAll(stopAllListener),
      api.tray.onStartWorkPeriod(startWorkPeriodListener),
    ]
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe()
    }
  }, [onStartSubtask, onStopSubtask, onStopAll, onStartWorkPeriod])

  // Main-process heartbeat: re-renders so the clock is re-read even when the
  // renderer's own interval was throttled or suspended (hidden window, sleep).
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    return api.tray.onTick(() => setTick((t) => t + 1))
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    return api.hotkey.onToggle(() => {
      if (isTracking) void onStopAll()
    })
  }, [isTracking, onStopAll])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const offTray = api.tray.onTogglePresentingMode(toggleHoursDisplay)
    const offHotkey = api.hotkey.onTogglePresenting(toggleHoursDisplay)
    return () => {
      offTray()
      offHotkey()
    }
  }, [toggleHoursDisplay])

  return { isTracking, isOvertime: remaining < 0 }
}
