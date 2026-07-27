import { useMsal } from '@azure/msal-react'
import { graphScopes, msalInstance } from '../../infra/auth/msalInstance'
import { clearBootstrapConfig } from '../../infra/auth/bootstrapConfig'
import { useAuthStore } from '../../shared/authStore'

function MsalSyncPanel() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const account = accounts[0]

  async function handleSignIn() {
    try {
      await instance.loginPopup({ scopes: graphScopes })
    } catch {
      // User cancelled or popup blocked — no action needed
    }
  }

  async function handleSignOut() {
    try {
      await instance.logoutPopup(account ? { account } : {})
    } catch {
      // ignore
    }
  }

  return (
    <>
      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-emerald-700 bg-green-50 dark:bg-emerald-900/30 px-3 py-2">
            <span className="text-sm">☁️</span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-green-800 dark:text-emerald-400">Synced with OneDrive</span>
              <span className="text-xs text-green-700 dark:text-emerald-400">{account?.username}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => {
                clearBootstrapConfig()
                window.location.reload()
              }}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Change Azure AD configuration
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2">
            <span className="text-sm">💾</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Offline — data stored in this browser only</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSignIn()}
              className="self-start rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
            >
              Sign in with Microsoft
            </button>
            <button
              type="button"
              onClick={() => {
                clearBootstrapConfig()
                window.location.reload()
              }}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Change Azure AD configuration
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function NotConfiguredPanel() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2">
        <span className="text-sm">💾</span>
        <span className="text-xs text-amber-800 dark:text-amber-400">
          Microsoft not configured — running in local-only mode
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          clearBootstrapConfig()
          window.location.reload()
        }}
        className="self-start rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
      >
        Configure Microsoft Azure AD
      </button>
    </div>
  )
}

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
