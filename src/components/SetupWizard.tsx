import { useState } from 'react'
import { writeBootstrapConfig, skipSetup, setLocalFolderMode } from '../auth/bootstrapConfig'
import { saveHandle } from '../storage/folder-handle-store'

interface Props {
  onSkip: () => void
}

export function SetupWizard({ onSkip }: Props) {
  const [clientId, setClientId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pickingFolder, setPickingFolder] = useState(false)

  function handleSave() {
    if (!clientId.trim() || !tenantId.trim()) {
      setError('Both Client ID and Tenant ID are required.')
      return
    }
    writeBootstrapConfig({ clientId: clientId.trim(), tenantId: tenantId.trim() })
  }

  function handleSkip() {
    skipSetup()
    onSkip()
  }

  async function handleLocalFolder() {
    type PickerFn = (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
    const picker = (window as Window & { showDirectoryPicker?: PickerFn }).showDirectoryPicker
    const isBrave = 'brave' in navigator
    if (!picker) {
      setError(
        isBrave
          ? 'Brave Shields are blocking this feature. Click the lion icon → set Fingerprinting to Standard → try again.'
          : 'File System Access API not supported. Use Chrome or Edge.',
      )
      return
    }
    setPickingFolder(true)
    setError(null)
    try {
      const handle = await picker.call(window, { mode: 'readwrite' })
      await saveHandle(handle)
      setLocalFolderMode()
      window.location.reload()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      const msg = e instanceof Error ? e.message : 'Failed to open folder picker'
      setError(
        isBrave
          ? `${msg} — if Brave Shields are active, set Fingerprinting to Standard and try again.`
          : msg,
      )
    } finally {
      setPickingFolder(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Timetracker</h1>
          <p className="text-sm text-gray-500">
            To enable cloud sync and SharePoint export, connect your Microsoft Azure AD app.
            You can skip this and use the app in local-only mode.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
              Application (Client) ID
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
              Directory (Tenant) ID
            </label>
            <input
              id="tenantId"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-400">
            Find these in{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Azure Portal → App registrations
            </a>
            . The redirect URI to register is <strong>{window.location.origin}</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Save &amp; Connect
          </button>
          <button
            onClick={() => void handleLocalFolder()}
            disabled={pickingFolder}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {pickingFolder ? 'Picking folder…' : 'Use Local Folder'}
          </button>
          <button
            onClick={handleSkip}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 rounded-lg transition-colors"
          >
            Skip — use locally only
          </button>
        </div>
      </div>
    </div>
  )
}
