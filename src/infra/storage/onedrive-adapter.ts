import { StorageConflictError, type StorageAdapter } from './adapter'

export type TokenProvider = () => Promise<string>

const APPROOT = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:'

function readItem(item: unknown): { eTag: string | null; downloadUrl: string | null } {
  if (typeof item !== 'object' || item === null) return { eTag: null, downloadUrl: null }
  const eTag = 'eTag' in item && typeof item.eTag === 'string' ? item.eTag : null
  const url = '@microsoft.graph.downloadUrl' in item ? item['@microsoft.graph.downloadUrl'] : null
  return { eTag, downloadUrl: typeof url === 'string' ? url : null }
}

/**
 * Persists JSON blobs to OneDrive App Folder via Microsoft Graph API.
 * Each key maps to a file: /me/drive/special/approot:/{key}
 *
 * Remembers the eTag of every file it read or wrote and sends it as If-Match,
 * so a write over a file another device changed fails with
 * StorageConflictError instead of silently overwriting it (ADR 0013).
 */
export class OneDriveStorageAdapter implements StorageAdapter {
  private tokenProvider: TokenProvider
  // eTag of the version we last saw; null = we saw the file does not exist.
  private etags = new Map<string, string | null>()

  constructor(tokenProvider: TokenProvider) {
    this.tokenProvider = tokenProvider
  }

  async get<T>(key: string): Promise<T | null> {
    const token = await this.tokenProvider()
    const meta = await fetch(`${APPROOT}/${key}`, { headers: { Authorization: `Bearer ${token}` } })
    if (meta.status === 404) {
      this.etags.set(key, null)
      return null
    }
    if (!meta.ok) throw new Error(`OneDrive GET failed: ${meta.status} ${meta.statusText}`)
    const { eTag, downloadUrl } = readItem(await meta.json())
    if (!downloadUrl) throw new Error(`OneDrive GET failed: no download URL for ${key}`)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`OneDrive GET failed: ${res.status} ${res.statusText}`)
    const data: unknown = await res.json()
    this.rememberETag(key, eTag)
    return data as T
  }

  async put<T>(key: string, data: T): Promise<void> {
    const token = await this.tokenProvider()
    const known = this.etags.get(key)
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (known) headers['If-Match'] = known
    // Known-absent file: fail (409) rather than overwrite one another device just created.
    const query = known === null ? '?@microsoft.graph.conflictBehavior=fail' : ''
    const res = await fetch(`${APPROOT}/${key}:/content${query}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
    if (res.status === 412 || res.status === 409) {
      this.etags.delete(key)
      throw new StorageConflictError(key)
    }
    if (!res.ok) throw new Error(`OneDrive PUT failed: ${res.status} ${res.statusText}`)
    this.rememberETag(key, readItem(await res.json().catch(() => null)).eTag)
  }

  async delete(key: string): Promise<void> {
    const token = await this.tokenProvider()
    const known = this.etags.get(key)
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (known) headers['If-Match'] = known
    const res = await fetch(`${APPROOT}/${key}:`, { method: 'DELETE', headers })
    if (res.status === 412) {
      this.etags.delete(key)
      throw new StorageConflictError(key)
    }
    if (!res.ok && res.status !== 404) throw new Error(`OneDrive DELETE failed: ${res.status} ${res.statusText}`)
    this.etags.set(key, null)
  }

  private rememberETag(key: string, eTag: string | null): void {
    if (eTag) this.etags.set(key, eTag)
    else this.etags.delete(key)
  }
}
