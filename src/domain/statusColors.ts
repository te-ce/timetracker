import type { DayStatus } from './dayStatus'

export type DisplayStatus = Exclude<DayStatus, 'today'>

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  confirmed: 'Confirmed',
  tracked: 'Tracked',
  'needs-review': 'Needs review',
  untracked: 'Untracked',
  future: 'Future',
  'non-working': 'Non-working',
  leave: 'Leave',
}

// Small dot indicators used in grids and legends
export const STATUS_DOT: Record<DisplayStatus, string> = {
  confirmed: 'bg-emerald-600',
  tracked: 'bg-emerald-400',
  'needs-review': 'bg-yellow-400',
  untracked: 'bg-blue-300',
  future: 'bg-gray-300',
  'non-working': 'bg-gray-300',
  leave: 'bg-purple-400',
}

// Full-cell background + text (calendar day cells)
export const STATUS_CELL: Record<DayStatus, string> = {
  confirmed: 'bg-emerald-600 text-white hover:bg-emerald-700',
  tracked: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60',
  'needs-review': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50',
  untracked: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  future: 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  today: 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  'non-working': 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
  leave: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// Inline badge chips (bg + text classes, without hover)
export const STATUS_BADGE: Record<DisplayStatus, { bg: string; text: string }> = {
  confirmed: { bg: 'bg-emerald-600', text: 'text-white' },
  tracked: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400' },
  'needs-review': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  untracked: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  future: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  'non-working': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  leave: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
}

// [even-row bg, odd-row bg] for spreadsheet-style grid rows
export const STATUS_ROW_BG: Record<DisplayStatus, [string, string]> = {
  confirmed: ['bg-emerald-100 dark:bg-emerald-900/40', 'bg-emerald-200/60 dark:bg-emerald-900/60'],
  tracked: ['bg-emerald-50 dark:bg-emerald-900/30', 'bg-emerald-100/70 dark:bg-emerald-900/50'],
  'needs-review': ['bg-yellow-50 dark:bg-yellow-900/30', 'bg-yellow-100/70 dark:bg-yellow-900/50'],
  untracked: ['bg-blue-50/60 dark:bg-blue-900/20', 'bg-blue-100/50 dark:bg-blue-900/30'],
  future: ['bg-white dark:bg-gray-800', 'bg-gray-50/70 dark:bg-gray-900/50'],
  'non-working': ['bg-white dark:bg-gray-800', 'bg-gray-50/70 dark:bg-gray-900/50'],
  leave: ['bg-purple-50/60 dark:bg-purple-900/20', 'bg-purple-100/50 dark:bg-purple-900/30'],
}
