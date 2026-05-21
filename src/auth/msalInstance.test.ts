import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as msalModule from './msalInstance'

describe('getAccessToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when no MSAL accounts are signed in', async () => {
    vi.spyOn(msalModule.msalInstance, 'getAllAccounts').mockReturnValue([])
    await expect(msalModule.getAccessToken()).rejects.toThrow('Not authenticated')
  })

  it('returns the access token from acquireTokenSilent when authenticated', async () => {
    const fakeAccount = { username: 'user@corp.com', homeAccountId: 'abc', environment: 'login.microsoftonline.com', tenantId: 'tenant', localAccountId: 'local' }
    vi.spyOn(msalModule.msalInstance, 'getAllAccounts').mockReturnValue([fakeAccount])
    vi.spyOn(msalModule.msalInstance, 'acquireTokenSilent').mockResolvedValue({
      accessToken: 'mock-token-123',
    } as never)

    const token = await msalModule.getAccessToken()
    expect(token).toBe('mock-token-123')
  })

  it('passes the first account and graphScopes to acquireTokenSilent', async () => {
    const fakeAccount = { username: 'user@corp.com', homeAccountId: 'abc', environment: 'login.microsoftonline.com', tenantId: 'tenant', localAccountId: 'local' }
    vi.spyOn(msalModule.msalInstance, 'getAllAccounts').mockReturnValue([fakeAccount])
    const silentSpy = vi.spyOn(msalModule.msalInstance, 'acquireTokenSilent').mockResolvedValue({
      accessToken: 'tok',
    } as never)

    await msalModule.getAccessToken()

    expect(silentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ account: fakeAccount }),
    )
  })
})
