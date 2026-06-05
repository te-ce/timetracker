import { create } from 'zustand'

export type TimeFormat = 'decimal' | 'hhmm'

const STORAGE_KEY = 'timetracker-time-format'

function getInitialFormat(): TimeFormat {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'hhmm' ? 'hhmm' : 'decimal'
}

interface TimeFormatState {
  format: TimeFormat
  toggleFormat: () => void
}

export const useTimeFormatStore = create<TimeFormatState>()((set, get) => ({
  format: getInitialFormat(),
  toggleFormat: () => {
    const next: TimeFormat = get().format === 'decimal' ? 'hhmm' : 'decimal'
    localStorage.setItem(STORAGE_KEY, next)
    set({ format: next })
  },
}))
