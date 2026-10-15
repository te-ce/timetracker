import { msalInstance, signInAgain } from '../../infra/auth/msalInstance'
import { flushPendingWrites } from '../../infra/repositories/shared'
import { useSyncStatus } from '../../infra/storage/sync-status'
import { useAuthStore } from '../../shared/authStore'
import { Tooltip } from '../../shared/Tooltip'

const BADGE = 'inline-flex items-center gap-1 rounded px-1 text-xs'

function resumeSync() {
  signInAgain()
    .then(flushPendingWrites)
    .catch((e: unknown) => console.warn('[SyncIndicator] sign-in failed', e))
}

export function SyncIndicator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const pendingWrites = useSyncStatus((s) => s.pendingWrites)
  const signInRequired = useSyncStatus((s) => s.signInRequired)

  if (signInRequired) {
    return (
      <Tooltip
        content="Your Microsoft session expired. Changes are kept on this device until you sign in."
        placement="bottom"
      >
        <button
          type="button"
          onClick={resumeSync}
          className={`${BADGE} bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300`}
        >
          <span aria-hidden="true">⚠️</span>
          <span>Sync paused – sign in</span>
        </button>
      </Tooltip>
    )
  }

  if (pendingWrites > 0) {
    return (
      <Tooltip content="Saved on this device, not yet in OneDrive. Click to retry." placement="bottom">
        <button
          type="button"
          onClick={() => void flushPendingWrites()}
          aria-label={`${pendingWrites} unsynced changes – retry sync`}
          className={`${BADGE} bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300`}
        >
          <span aria-hidden="true">⟳</span>
          <span>{pendingWrites} unsynced</span>
        </button>
      </Tooltip>
    )
  }

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
