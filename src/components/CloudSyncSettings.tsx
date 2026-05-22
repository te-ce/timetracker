import { useMsal } from '@azure/msal-react'
import { graphScopes, msalInstance } from '../auth/msalInstance'
import { clearBootstrapConfig } from '../auth/bootstrapConfig'
import { useAuthStore } from '../stores/authStore'

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
      await instance.logoutPopup({ account })
    } catch {
      // ignore
    }
  }

  return (
    <>
      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="text-sm">☁️</span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-green-800">Synced with OneDrive</span>
              <span className="text-xs text-green-700">{account.username}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleSignOut()}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Sign out
            </button>
            <button
              onClick={() => { clearBootstrapConfig(); window.location.reload() }}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Change Azure AD configuration
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-sm">💾</span>
            <span className="text-xs text-gray-600">Offline — data stored in this browser only</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleSignIn()}
              className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign in with Microsoft
            </button>
            <button
              onClick={() => { clearBootstrapConfig(); window.location.reload() }}
              className="self-start rounded border px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
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
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <span className="text-sm">💾</span>
        <span className="text-xs text-amber-800">
          Microsoft not configured — running in local-only mode
        </span>
      </div>
      <button
        onClick={() => { clearBootstrapConfig(); window.location.reload() }}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
        <h3 className="text-sm font-semibold text-gray-700">OneDrive Sync</h3>
        <p className="text-xs text-gray-500">
          Sign in with your Microsoft Work/School account to sync data across devices via OneDrive.
          Without sign-in, data is stored locally in this browser only.
        </p>
      </div>

      {msalInstance ? <MsalSyncPanel /> : <NotConfiguredPanel />}
    </section>
  )
}
