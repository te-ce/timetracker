import { create } from 'zustand'

interface AuthState {
  /** The Microsoft Access Token used for Graph API calls. Null when not logged in. */
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
}))
