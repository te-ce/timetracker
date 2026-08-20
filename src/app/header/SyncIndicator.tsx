import { msalInstance } from '../../infra/auth/msalInstance'
import { useAuthStore } from '../../shared/authStore'
import { Tooltip } from '../../shared/Tooltip'

export function SyncIndicator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

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
