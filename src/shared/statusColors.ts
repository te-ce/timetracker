import type { DayStatus } from './dayStatus'

export type DisplayStatus = Exclude<DayStatus, 'today'>

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  complete: 'Complete',
  'needs-review': 'Needs review',
  untracked: 'Untracked',
  future: 'Future',
  'non-working': 'Non-working',
  leave: 'Leave',
}

// Small dot indicators used in grids and legends
export const STATUS_DOT: Record<DisplayStatus, string> = {
  complete: 'bg-emerald-500',
  'needs-review': 'bg-red-400',
  untracked: 'bg-blue-300',
  future: 'bg-gray-200',
  'non-working': 'bg-gray-400',
  leave: 'bg-purple-400',
}

// Full-cell background + text (calendar day cells)
export const STATUS_CELL: Record<DayStatus, string> = {
  complete:
    'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60',
  'needs-review':
    'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
  untracked:
    'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  // Days that have not happened yet recede — faded — so today and the untracked past days are
  // what catch the eye.
  future: 'bg-gray-50/60 text-gray-400 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-500 dark:hover:bg-gray-800',
  today: 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  'non-working': 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
  leave: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// Inline badge chips (bg + text classes, without hover)
export const STATUS_BADGE: Record<DisplayStatus, { bg: string; text: string }> = {
  complete: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400' },
  'needs-review': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  untracked: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  future: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  'non-working': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  leave: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
}
