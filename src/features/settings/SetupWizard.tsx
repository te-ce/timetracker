import { useState } from 'react'
import { writeBootstrapConfig, skipSetup, setLocalFolderMode } from '../../infra/auth/bootstrapConfig'
import { saveHandle } from '../../infra/storage/folder-handle-store'

interface Props {
  onSkip: () => void
}

function detectBrowserSupport(ua: string): {
  isBrave: boolean
  isOpera: boolean
  isFirefox: boolean
  isSafari: boolean
} {
  return {
    isBrave: 'brave' in navigator,
    isOpera: ua.includes('OPR/') || ua.includes('Opera/'),
    isFirefox: ua.includes('Firefox/'),
    isSafari: ua.includes('Safari/') && !ua.includes('Chrome/') && !ua.includes('Chromium/'),
  }
}

function getApiUnsupportedError(ua: string): string {
  const browser = detectBrowserSupport(ua)
  if (!window.isSecureContext) {
    return 'File System Access API requires HTTPS or localhost. The app must be served over a secure connection.'
  }
  if (browser.isBrave) {
    return (
      'Brave has the File System Access API disabled. ' +
      'Type brave://flags/#file-system-access-api in the address bar and enable it, then reload.'
    )
  }
  if (browser.isFirefox) {
    return (
      'Firefox does not support the File System Access API. ' + 'Use Chrome, Edge, or Opera to use local folder sync.'
    )
  }
  if (browser.isSafari) {
    return (
      'This version of Safari does not support folder picking. ' +
      'Update to Safari 17+ or use Chrome, Edge, or Opera for full compatibility.'
    )
  }
  if (browser.isOpera) {
    return (
      'Opera may have the File System Access API disabled. ' +
      'Try opera://flags/#file-system-access-api or use Chrome/Edge instead.'
    )
  }
  return 'File System Access API not supported. Use Chrome, Edge, or Opera.'
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
    const ua = navigator.userAgent
    const browser = detectBrowserSupport(ua)
    if (!window.showDirectoryPicker) {
      setError(getApiUnsupportedError(ua))
      return
    }
    setPickingFolder(true)
    setError(null)
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await saveHandle(handle)
      setLocalFolderMode()
      window.location.reload()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      const name = e instanceof DOMException ? e.name : ''
      const msg = e instanceof Error ? e.message : 'Failed to open folder picker'
      const detail = name ? `[${name}] ${msg}` : msg
      let hint = ''
      if (browser.isBrave) hint = ' — try disabling Brave Shields entirely for this site (lion icon → Shields down).'
      else if (browser.isSafari)
        hint = ' — Safari has limited folder access support; try Chrome or Edge if this persists.'
      setError(`${detail}${hint}`)
    } finally {
      setPickingFolder(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to Timetracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To enable cloud sync and SharePoint export, connect your Microsoft Azure AD app. You can skip this and use
            the app in local-only mode.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Application (Client) ID
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Directory (Tenant) ID
            </label>
            <input
              id="tenantId"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Find these in{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 underline"
            >
              Azure Portal → App registrations
            </a>
            . The redirect URI to register is <strong>{window.location.origin}</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Save &amp; Connect
          </button>
          <button
            onClick={() => void handleLocalFolder()}
            disabled={pickingFolder}
            className="w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {pickingFolder ? 'Picking folder…' : 'Use Local Folder'}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Supported in Chrome, Edge &amp; Opera. Brave needs{' '}
            <code className="font-mono">brave://flags/#file-system-access-api</code> enabled. Safari 17+ has partial
            support. Firefox is not supported.
          </p>
          <button
            onClick={handleSkip}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm py-2 rounded-lg transition-colors"
          >
            Skip — use locally only
          </button>
        </div>
      </div>
    </div>
  )
}
