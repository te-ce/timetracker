import { msalInstance } from '../../infra/auth/msalInstance'
import { NotConfiguredPanel } from './NotConfiguredPanel'
import { MsalSyncPanel } from './MsalSyncPanel'

export function CloudSyncSettings() {
  return (
    <section aria-label="OneDrive sync settings" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">OneDrive Sync</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sign in with your Microsoft Work/School account to sync data across devices via OneDrive. Without sign-in,
          data is stored locally in this browser only.
        </p>
      </div>

      {msalInstance ? <MsalSyncPanel /> : <NotConfiguredPanel />}
    </section>
  )
}
