import { create } from 'zustand'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface AppState {
  selectedDate: string
  setSelectedDate: (date: string) => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDate: todayIso(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}))
