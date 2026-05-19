import type { StorageAdapter } from './adapter'

export type TokenProvider = () => Promise<string>

/**
 * Persists JSON blobs to OneDrive App Folder via Microsoft Graph API.
 * Each key maps to a file: /me/drive/special/approot:/{key}:/content
 */
export class OneDriveStorageAdapter implements StorageAdapter {
  private tokenProvider: TokenProvider

  constructor(tokenProvider: TokenProvider) {
    this.tokenProvider = tokenProvider
  }

  async get<T>(key: string): Promise<T | null> {
    const token = await this.tokenProvider()
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${key}:/content`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`OneDrive GET failed: ${res.status} ${res.statusText}`)
    return (await res.json()) as T
  }

  async put<T>(key: string, data: T): Promise<void> {
    const token = await this.tokenProvider()
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${key}:/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    )
    if (!res.ok) throw new Error(`OneDrive PUT failed: ${res.status} ${res.statusText}`)
  }

  async delete(key: string): Promise<void> {
    const token = await this.tokenProvider()
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${key}:`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (res.status === 404) return
    if (!res.ok) throw new Error(`OneDrive DELETE failed: ${res.status} ${res.statusText}`)
  }
}
