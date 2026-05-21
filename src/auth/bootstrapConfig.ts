const STORAGE_KEY = 'msal-bootstrap-config'
const SKIPPED_KEY = 'msal-bootstrap-skipped'

export interface BootstrapConfig {
  clientId: string
  tenantId: string
}

export function readBootstrapConfig(): BootstrapConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).clientId === 'string' &&
      typeof (parsed as Record<string, unknown>).tenantId === 'string'
    ) {
      return parsed as BootstrapConfig
    }
    return null
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
}

export function isSetupSkipped(): boolean {
  return localStorage.getItem(SKIPPED_KEY) === 'true'
}

export function skipSetup(): void {
  localStorage.setItem(SKIPPED_KEY, 'true')
}
