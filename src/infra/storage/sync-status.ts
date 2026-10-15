import { create } from 'zustand'

interface SyncStatus {
  /** Local writes OneDrive has not accepted yet (see FallbackStorageAdapter). */
  pendingWrites: number
  /** The silent token refresh needs user interaction; sync is paused until sign-in. */
  signInRequired: boolean
}

export const useSyncStatus = create<SyncStatus>()(() => ({ pendingWrites: 0, signInRequired: false }))
