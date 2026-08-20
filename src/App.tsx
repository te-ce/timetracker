import './App.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, Outlet, useRouterState, useNavigate, useRouter } from '@tanstack/react-router'
import { useUndoStore } from './shared/undoStore'
import { useElectronTraySync } from './shared/useElectronTraySync'
import { useGoalNotification } from './shared/useGoalNotification'
import { useSprintExportReminder } from './features/sprint/useSprintExportReminder'
import { SprintExportBadge } from './features/sprint/SprintExportBadge'
import { usePrefetchCurrentMonth } from './shared/usePrefetchCurrentMonth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyboardShortcutLegend } from './shared/KeyboardShortcutLegend'
import { toLocalIso } from './shared/dateUtils'
import { defaultHotkeyConfig, matchesShortcut } from './shared/hotkeyConfig'
import { QUERY_KEYS, invalidateConfig, invalidateMonthByYearMonth } from './shared/queryKeys'
import { useRepositories } from './infra/repositories/repositories-context'
import { isLocalFolderMode } from './infra/auth/bootstrapConfig'
import { useRetryOnFirstInteraction } from './shared/useRetryOnFirstInteraction'
import { HeaderControls } from './app/header/HeaderControls'
import { NavDropdown } from './app/header/NavDropdown'
import { NAV_ITEMS } from './app/icons/navItems'
import {
  resolveStartupPath,
  getLastViewPath,
  saveLastViewPath,
  normalizeLastViewPath,
} from './features/settings/resolveStartupPath'

function isDaySearch(search: unknown): search is { date: string } {
  return typeof search === 'object' && search !== null && 'date' in search && typeof search.date === 'string'
}

function App() {
  const { configRepo } = useRepositories()
  const queryClient = useQueryClient()
  useElectronTraySync()
  useGoalNotification()
  const {
    isPending: monthIsPending,
    isError: monthIsError,
    year: currentMonthYear,
    month: currentMonth,
  } = usePrefetchCurrentMonth()
  const sprintBadgeState = useSprintExportReminder()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const navigate = useNavigate()
  const router = useRouter()
  const { undo, redo } = useUndoStore()
  const [legendOpen, setLegendOpen] = useState(false)

  const {
    data: appConfig,
    isPending: configIsPending,
    isError: configIsError,
  } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })
  const hotkeyConfig = appConfig?.hotkeys ?? defaultHotkeyConfig()

  // Bails out of the loading gate if config/month fetches hang (e.g. slow/stuck
  // auth) instead of blocking the app forever — falls back to the old
  // render-with-defaults behavior.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Local-folder permission isn't persisted across restarts, so the initial
  // config/month fetch can fail with no active user gesture available to grant
  // it. Retry both on the user's first interaction with the page, which does
  // carry a gesture — no more manually clicking a nav tab to "wake up" storage.
  const retryAfterPermissionFailure = useCallback(() => {
    invalidateConfig(queryClient)
    invalidateMonthByYearMonth(queryClient, currentMonthYear, currentMonth)
  }, [queryClient, currentMonthYear, currentMonth])
  useRetryOnFirstInteraction(isLocalFolderMode() && (configIsError || monthIsError), retryAfterPermissionFailure)

  const startupNavigated = useRef(false)
  useEffect(() => {
    if (!appConfig || startupNavigated.current || !appConfig.startupView) return
    startupNavigated.current = true
    const today = toLocalIso(new Date())
    const target = resolveStartupPath(appConfig.startupView, getLastViewPath(), today)
    router.history.push(target)
  }, [appConfig, router])

  const appConfigRef = useRef(appConfig)
  useEffect(() => {
    appConfigRef.current = appConfig
  }, [appConfig])

  useEffect(() => {
    const api = window.electronAPI?.window
    if (!api) return
    const onShow = () => {
      const cfg = appConfigRef.current
      if (!cfg?.startupView) return
      const today = toLocalIso(new Date())
      router.history.push(resolveStartupPath(cfg.startupView, getLastViewPath(), today))
    }
    api.onShow(onShow)
    return () => api.offShow(onShow)
  }, [router])

  useEffect(() => {
    const loc = routerState.location
    saveLastViewPath(normalizeLastViewPath(loc.pathname, loc.searchStr, toLocalIso(new Date())))
  }, [routerState.location])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
        if (e.target.isContentEditable) return
      }

      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      function handleCtrlShortcuts() {
        if (matchesShortcut(hotkeyConfig, 'undo', e.key, ctrl, shift)) {
          e.preventDefault()
          void undo()
          return true
        }
        if (matchesShortcut(hotkeyConfig, 'redo', e.key, ctrl, shift)) {
          e.preventDefault()
          void redo()
          return true
        }
        return false
      }

      function navigateDayOffset(loc: typeof router.state.location, delta: number) {
        const current = isDaySearch(loc.search) ? loc.search.date : toLocalIso(new Date())
        const d = new Date(current)
        d.setDate(d.getDate() + delta)
        void navigate({ to: '/', search: { date: toLocalIso(d) } })
      }

      function handleNavShortcuts() {
        const loc = router.state.location
        const path = loc.pathname
        const now = new Date()
        const defaultMonthSearch = { year: now.getFullYear(), month: now.getMonth() + 1 }
        function goTodayOrHome() {
          if (path === '/') {
            void navigate({ to: '/', search: { date: toLocalIso(new Date()) } })
          } else {
            void navigate({ to: '/month', search: defaultMonthSearch })
          }
        }
        function goPrevDay() {
          if (path === '/') navigateDayOffset(loc, -1)
        }
        function goNextDay() {
          if (path === '/') navigateDayOffset(loc, 1)
        }
        if (matchesShortcut(hotkeyConfig, 'monthView', e.key, ctrl, shift)) {
          void navigate({ to: '/month', search: defaultMonthSearch })
        } else if (matchesShortcut(hotkeyConfig, 'tableView', e.key, ctrl, shift)) {
          void navigate({ to: '/table', search: { ...defaultMonthSearch, logDate: undefined } })
        } else if (matchesShortcut(hotkeyConfig, 'dayView', e.key, ctrl, shift)) {
          void navigate({ to: '/', search: { date: toLocalIso(new Date()) } })
        } else if (matchesShortcut(hotkeyConfig, 'sprintView', e.key, ctrl, shift)) {
          void navigate({ to: '/sprint', search: { sprint: undefined } })
        } else if (matchesShortcut(hotkeyConfig, 'today', e.key, ctrl, shift)) {
          goTodayOrHome()
        } else if (matchesShortcut(hotkeyConfig, 'prevDay', e.key, ctrl, shift)) {
          goPrevDay()
        } else if (matchesShortcut(hotkeyConfig, 'nextDay', e.key, ctrl, shift)) {
          goNextDay()
        } else if (matchesShortcut(hotkeyConfig, 'toggleLegend', e.key, ctrl, shift)) {
          setLegendOpen((v) => !v)
        }
      }

      if (ctrl) {
        handleCtrlShortcuts()
        return
      }
      handleNavShortcuts()
    },
    [navigate, router, undo, redo, hotkeyConfig],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if ((configIsPending || monthIsPending) && !loadingTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <nav
        className="sticky top-0 z-50 flex items-center gap-1 border-b border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        aria-label="Main navigation"
      >
        <span className="mr-6 text-lg font-bold tracking-tight">Timetracker</span>
        {/* Full nav links — hidden on small screens */}
        <div className="hidden min-[850px]:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPath === item.to
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
        {/* Hamburger — visible only on small screens */}
        <NavDropdown currentPath={currentPath} />
        <div className="ml-auto flex items-center gap-2">
          <SprintExportBadge state={sprintBadgeState} />
          <HeaderControls onToggleLegend={() => setLegendOpen((v) => !v)} />
        </div>
      </nav>
      {legendOpen && <KeyboardShortcutLegend onClose={() => setLegendOpen(false)} />}

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App
