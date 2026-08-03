import './App.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import type React from 'react'
import { Link, Outlet, useRouterState, useNavigate, useRouter } from '@tanstack/react-router'
import { useAuthStore } from './shared/authStore'
import { useThemeStore } from './shared/themeStore'
import { useTimeFormatStore } from './shared/timeFormatStore'
import { useUndoStore } from './shared/undoStore'
import { useAppConfig } from './shared/useAppConfig'
import { useRemainingHours } from './shared/useRemainingHours'
import { buildReceipt, buildBadgeLabel } from './shared/remainingCalc'
import { useElectronTraySync } from './shared/useElectronTraySync'
import { useGoalNotification } from './shared/useGoalNotification'
import { useSprintExportReminder } from './features/sprint/useSprintExportReminder'
import { SprintExportBadge } from './features/sprint/SprintExportBadge'
import { usePrefetchCurrentMonth } from './shared/usePrefetchCurrentMonth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyboardShortcutLegend } from './shared/KeyboardShortcutLegend'
import { Tooltip } from './shared/Tooltip'
import { msalInstance } from './infra/auth/msalInstance'
import { toLocalIso } from './shared/dateUtils'
import { defaultHotkeyConfig, matchesShortcut } from './shared/hotkeyConfig'
import { QUERY_KEYS, invalidateConfig, invalidateMonthByYearMonth } from './shared/queryKeys'
import { useRepositories } from './infra/repositories/RepositoryContext'
import { isLocalFolderMode } from './infra/auth/bootstrapConfig'
import { useRetryOnFirstInteraction } from './shared/useRetryOnFirstInteraction'
import {
  resolveStartupPath,
  getLastViewPath,
  saveLastViewPath,
  normalizeLastViewPath,
} from './features/settings/resolveStartupPath'

function IconCalendar() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconTable() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconDay() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconBolt() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  )
}

const NAV_ITEMS: { label: string; icon: React.ReactNode; to: string }[] = [
  { label: 'Day', icon: <IconDay />, to: '/' },
  { label: 'Month', icon: <IconCalendar />, to: '/month' },
  { label: 'Table', icon: <IconTable />, to: '/table' },
  { label: 'Sprint', icon: <IconBolt />, to: '/sprint' },
  { label: 'Settings', icon: <IconSettings />, to: '/settings' },
]

function isDaySearch(search: unknown): search is { date: string } {
  return typeof search === 'object' && search !== null && 'date' in search && typeof search.date === 'string'
}

function SyncIndicator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!msalInstance) {
    return (
      <Tooltip content="Microsoft not configured — local only" placement="bottom">
        <span
          className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"
          aria-label="Local only mode"
        >
          <span aria-hidden="true">💾</span>
          <span>Local</span>
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content={isAuthenticated ? 'Synced with OneDrive' : 'Offline — sign in to sync'} placement="bottom">
      <span
        className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"
        aria-label={isAuthenticated ? 'OneDrive sync active' : 'Offline mode'}
      >
        <span aria-hidden="true">{isAuthenticated ? '☁️' : '💾'}</span>
        <span>{isAuthenticated ? 'OneDrive' : 'Offline'}</span>
      </span>
    </Tooltip>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      {theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.166 17.834a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.061-1.06l-1.59-1.591ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.166 6.106a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061L6.166 6.106Z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}

function UndoButton() {
  const { canUndo, canRedo, undo, redo } = useUndoStore()
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => void undo()}
        disabled={!canUndo}
        aria-label="Undo"
        data-tooltip="Undo (Ctrl+Z)"
        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void redo()}
        disabled={!canRedo}
        aria-label="Redo"
        data-tooltip="Redo (Ctrl+Shift+Z)"
        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>
    </div>
  )
}

function RemainingHoursBadge() {
  const config = useAppConfig()
  const { remaining, sollstunden, priorOvertime, workedHours, liveElapsed } = useRemainingHours()
  const timeFormat = useTimeFormatStore((s) => s.format)

  if (!config.showWorkedHoursInNav) return null

  const showTotalWorked = config.showTotalWorked
  const totalWorked = workedHours + liveElapsed
  const remainingTimeMode = config.remainingTimeMode

  const label = buildBadgeLabel(remaining, totalWorked, timeFormat, showTotalWorked)
  let badgeClass: string
  if (showTotalWorked) {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400'
  } else if (remaining > 0) {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'
  } else {
    badgeClass =
      'hidden sm:inline-flex items-center whitespace-nowrap rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400'
  }

  const receiptLines = buildReceipt(
    sollstunden,
    priorOvertime,
    workedHours,
    liveElapsed,
    remaining,
    timeFormat,
    remainingTimeMode,
  )
  const tooltipContent = (
    <div className="space-y-0.5 text-xs">
      {receiptLines.map((line) =>
        line.isTotal ? (
          <div key={line.label} className="flex justify-between gap-4 border-t border-gray-500 pt-0.5 font-semibold">
            <span>{line.label}</span>
            {line.value && <span className="tabular-nums">{line.value}</span>}
          </div>
        ) : line.isSubItem ? (
          <div key={line.label} className="flex justify-between gap-4 pl-3 text-gray-400 dark:text-gray-500">
            <span>{line.label}</span>
            <span className="tabular-nums">{line.value}</span>
          </div>
        ) : (
          <div key={line.label} className="flex justify-between gap-4">
            <span>{line.label}</span>
            <span className="tabular-nums">{line.value}</span>
          </div>
        ),
      )}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <span className={badgeClass}>{label}</span>
    </Tooltip>
  )
}

function OfficeStatsBadge() {
  const config = useAppConfig()
  const { officeDays, totalWorkDays, officePercent } = useRemainingHours()
  if (!config.officeStats) return null
  if (totalWorkDays === 0) return null
  const tooltipContent = `${officeDays}/${totalWorkDays} days in office this month`
  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <span className="hidden sm:inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        🏢 {officePercent}%
      </span>
    </Tooltip>
  )
}

function TimeFormatToggle() {
  const { format, toggleFormat } = useTimeFormatStore()
  return (
    <button
      type="button"
      onClick={toggleFormat}
      aria-label={format === 'decimal' ? 'Switch to HH:MM format' : 'Switch to decimal format'}
      data-tooltip={format === 'decimal' ? 'Switch to HH:MM format' : 'Switch to decimal format'}
      className="rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs font-medium tabular-nums text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      {format === 'decimal' ? 'Dec.' : 'HH:MM'}
    </button>
  )
}

function KeyboardShortcutsButton({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Keyboard shortcuts"
      data-tooltip="Keyboard shortcuts (?)"
      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
      </svg>
    </button>
  )
}

const HEADER_ITEM_IDS = ['remainingHours', 'officeStats', 'sync', 'timeFormat', 'undo', 'shortcuts', 'theme'] as const
type HeaderItemId = (typeof HEADER_ITEM_IDS)[number]

interface HeaderLayoutState {
  order: HeaderItemId[]
  hidden: HeaderItemId[]
}

const HEADER_ITEM_LABELS: Record<HeaderItemId, string> = {
  remainingHours: 'Hours',
  officeStats: 'Office stats',
  sync: 'Sync',
  timeFormat: 'Time format',
  undo: 'Undo / Redo',
  shortcuts: 'Shortcuts',
  theme: 'Theme',
}

function normalizeHeaderLayout(raw: unknown): HeaderLayoutState {
  const valid = new Set<string>(HEADER_ITEM_IDS)
  const obj = typeof raw === 'object' && raw !== null ? raw : {}
  const rawOrder = 'order' in obj && Array.isArray(obj.order) ? obj.order : []
  const rawHidden = 'hidden' in obj && Array.isArray(obj.hidden) ? obj.hidden : []
  const order = rawOrder.filter((id): id is HeaderItemId => typeof id === 'string' && valid.has(id))
  const hidden = rawHidden.filter((id): id is HeaderItemId => typeof id === 'string' && valid.has(id))
  for (const id of HEADER_ITEM_IDS) {
    if (!order.includes(id)) order.push(id)
  }
  return { order, hidden }
}

const HEADER_LAYOUT_STORAGE_KEY = 'header-layout:v1'

function loadHeaderLayout(): HeaderLayoutState {
  try {
    const raw = localStorage.getItem(HEADER_LAYOUT_STORAGE_KEY)
    if (raw) return normalizeHeaderLayout(JSON.parse(raw))
  } catch {
    /* empty */
  }
  return normalizeHeaderLayout({})
}

function saveHeaderLayout(state: HeaderLayoutState) {
  localStorage.setItem(HEADER_LAYOUT_STORAGE_KEY, JSON.stringify(state))
}

function NavDropdown({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const active = NAV_ITEMS.find((item) => item.to === currentPath)

  return (
    <div className="relative max-[849px]:block hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {active?.icon}
        <span>{active?.label ?? 'Menu'}</span>
        <svg
          className="h-3 w-3 ml-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors first:rounded-t-md last:rounded-b-md ${
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
      )}
    </div>
  )
}

function HeaderControls({ onToggleLegend }: { onToggleLegend: () => void }) {
  const [layout, setLayout] = useState<HeaderLayoutState>(loadHeaderLayout)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<HeaderItemId | null>(null)
  const dragItemRef = useRef<HeaderItemId | null>(null)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overflowOpen) return
    function onClickOutside(e: MouseEvent) {
      if (overflowRef.current && e.target instanceof Node && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [overflowOpen])

  function updateLayout(next: HeaderLayoutState) {
    setLayout(next)
    saveHeaderLayout(next)
  }

  function hideItem(id: HeaderItemId) {
    updateLayout({ ...layout, hidden: [...layout.hidden, id] })
  }

  function showItem(id: HeaderItemId) {
    updateLayout({ ...layout, hidden: layout.hidden.filter((h) => h !== id) })
    setOverflowOpen(false)
  }

  function onDragStart(id: HeaderItemId) {
    dragItemRef.current = id
  }

  function onDragOver(e: React.DragEvent, id: HeaderItemId) {
    e.preventDefault()
    setDragOverId(id)
  }

  function onDrop(targetId: HeaderItemId) {
    const src = dragItemRef.current
    if (!src || src === targetId) {
      setDragOverId(null)
      return
    }
    const order = [...layout.order]
    const fromIdx = order.indexOf(src)
    const toIdx = order.indexOf(targetId)
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, src)
    updateLayout({ ...layout, order })
    setDragOverId(null)
    dragItemRef.current = null
  }

  function onDragEnd() {
    setDragOverId(null)
    dragItemRef.current = null
  }

  function renderItem(id: HeaderItemId): React.ReactNode {
    switch (id) {
      case 'remainingHours':
        return <RemainingHoursBadge />
      case 'officeStats':
        return <OfficeStatsBadge />
      case 'sync':
        return <SyncIndicator />
      case 'timeFormat':
        return <TimeFormatToggle />
      case 'undo':
        return <UndoButton />
      case 'shortcuts':
        return <KeyboardShortcutsButton onToggle={onToggleLegend} />
      case 'theme':
        return <ThemeToggle />
    }
  }

  const hiddenSet = new Set(layout.hidden)
  const visible = layout.order.filter((id) => !hiddenSet.has(id))
  const hidden = layout.hidden

  return (
    <div className="flex items-center gap-1">
      {visible.map((id) => (
        <div
          key={id}
          className={`group relative flex items-center rounded-md transition-shadow ${dragOverId === id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
          draggable
          onDragStart={() => onDragStart(id)}
          onDragOver={(e) => onDragOver(e, id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={() => onDrop(id)}
          onDragEnd={onDragEnd}
          style={{ cursor: 'grab' }}
        >
          {renderItem(id)}
          <button
            type="button"
            onClick={() => hideItem(id)}
            aria-label={`Remove ${HEADER_ITEM_LABELS[id]}`}
            className="absolute -top-1.5 -right-1.5 z-10 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-2 h-2"
              aria-hidden="true"
            >
              <path d="M1 1l6 6M7 1L1 7" />
            </svg>
          </button>
        </div>
      ))}
      {hidden.length > 0 && (
        <div ref={overflowRef} className="relative">
          <button
            type="button"
            onClick={() => setOverflowOpen((v) => !v)}
            aria-label="Hidden header items"
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors leading-none"
          >
            •••
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-36 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 py-1">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">Hidden items</p>
              {hidden.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 flex items-center">{renderItem(id)}</div>
                  <button
                    type="button"
                    onClick={() => showItem(id)}
                    aria-label={`Restore ${HEADER_ITEM_LABELS[id]}`}
                    title={`Restore ${HEADER_ITEM_LABELS[id]}`}
                    className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="w-2.5 h-2.5"
                      aria-hidden="true"
                    >
                      <path d="M5 2v6M2 5h6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  const sprintsNeedingExport = useSprintExportReminder()
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
          void navigate({ to: '/table', search: { ...defaultMonthSearch, expanded: false, logDate: undefined } })
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
          <SprintExportBadge sprints={sprintsNeedingExport} />
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
