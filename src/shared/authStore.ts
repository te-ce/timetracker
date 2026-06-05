import { create } from 'zustand'

interface AuthState {
  /** True when a Microsoft account is signed in via MSAL. */
  isAuthenticated: boolean
  setIsAuthenticated: (authenticated: boolean) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  setIsAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
}))
