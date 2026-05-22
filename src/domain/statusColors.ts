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
  tracked: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  'needs-review': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  untracked: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  future: 'bg-white text-gray-600 hover:bg-gray-50',
  today: 'bg-white text-gray-900 hover:bg-gray-50',
  'non-working': 'bg-gray-100 text-gray-400',
  leave: 'bg-purple-100 text-purple-700',
}

// Inline badge chips (bg + text classes, without hover)
export const STATUS_BADGE: Record<DisplayStatus, { bg: string; text: string }> = {
  confirmed: { bg: 'bg-emerald-600', text: 'text-white' },
  tracked: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'needs-review': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  untracked: { bg: 'bg-blue-100', text: 'text-blue-700' },
  future: { bg: 'bg-gray-100', text: 'text-gray-500' },
  'non-working': { bg: 'bg-gray-100', text: 'text-gray-500' },
  leave: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

// [even-row bg, odd-row bg] for spreadsheet-style grid rows
export const STATUS_ROW_BG: Record<DisplayStatus, [string, string]> = {
  confirmed: ['bg-emerald-100', 'bg-emerald-200/60'],
  tracked: ['bg-emerald-50', 'bg-emerald-100/70'],
  'needs-review': ['bg-yellow-50', 'bg-yellow-100/70'],
  untracked: ['bg-blue-50/60', 'bg-blue-100/50'],
  future: ['bg-white', 'bg-gray-50/70'],
  'non-working': ['bg-white', 'bg-gray-50/70'],
  leave: ['bg-purple-50/60', 'bg-purple-100/50'],
}
