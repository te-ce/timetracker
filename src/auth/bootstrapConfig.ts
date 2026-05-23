const STORAGE_KEY = 'msal-bootstrap-config'
const SKIPPED_KEY = 'msal-bootstrap-skipped'
const LOCAL_FOLDER_KEY = 'timetracker-local-folder-mode'

export interface BootstrapConfig {
  clientId: string
  tenantId: string
}

function isBootstrapConfig(val: unknown): val is BootstrapConfig {
  if (typeof val !== 'object' || val === null) return false
  return (
    'clientId' in val &&
    'tenantId' in val &&
    typeof (val as { clientId: unknown }).clientId === 'string' &&
    typeof (val as { tenantId: unknown }).tenantId === 'string'
  )
}

export function readBootstrapConfig(): BootstrapConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isBootstrapConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeBootstrapConfig(cfg: BootstrapConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  localStorage.removeItem(SKIPPED_KEY)
  window.location.reload()
}

export function clearBootstrapConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(SKIPPED_KEY)
  localStorage.removeItem(LOCAL_FOLDER_KEY)
}

export function isLocalFolderMode(): boolean {
  return localStorage.getItem(LOCAL_FOLDER_KEY) === 'true'
}

export function setLocalFolderMode(): void {
  localStorage.setItem(LOCAL_FOLDER_KEY, 'true')
  localStorage.removeItem(SKIPPED_KEY)
}

export function isSetupSkipped(): boolean {
  return localStorage.getItem(SKIPPED_KEY) === 'true'
}

export function skipSetup(): void {
  localStorage.setItem(SKIPPED_KEY, 'true')
}
