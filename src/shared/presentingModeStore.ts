import { create } from 'zustand'

interface PresentingModeState {
  isPresenting: boolean
  setPresenting: (value: boolean) => void
  toggle: () => void
}

export const usePresentingModeStore = create<PresentingModeState>()((set, get) => ({
  isPresenting: false,
  setPresenting: (value) => set({ isPresenting: value }),
  toggle: () => set({ isPresenting: !get().isPresenting }),
}))
