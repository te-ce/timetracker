import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser'

vi.mock('./bootstrapConfig', () => ({
  readBootstrapConfig: () => ({ clientId: 'test-client-id', tenantId: 'test-tenant-id' }),
}))

import * as msalModule from './msalInstance'

function makeAuthResult(accessToken: string, account: AccountInfo): AuthenticationResult {
  return {
    authority: 'https://login.microsoftonline.com/tenant',
    uniqueId: 'unique-id',
    tenantId: 'tenant',
    scopes: [],
    account,
    idToken: '',
    idTokenClaims: {},
    accessToken,
    fromCache: false,
    expiresOn: null,
    tokenType: 'Bearer',
    correlationId: 'correlation-id',
  }
}

describe('getAccessToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when no MSAL accounts are signed in', async () => {
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([])
    await expect(msalModule.getAccessToken()).rejects.toThrow('Not authenticated')
  })

  it('returns the access token from acquireTokenSilent when authenticated', async () => {
    const fakeAccount = {
      username: 'user@corp.com',
      homeAccountId: 'abc',
      environment: 'login.microsoftonline.com',
      tenantId: 'tenant',
      localAccountId: 'local',
    }
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([fakeAccount])
    vi.spyOn(msalModule.msalInstance!, 'acquireTokenSilent').mockResolvedValue(
      makeAuthResult('mock-token-123', fakeAccount),
    )

    const token = await msalModule.getAccessToken()
    expect(token).toBe('mock-token-123')
  })

  it('passes the first account and graphScopes to acquireTokenSilent', async () => {
    const fakeAccount = {
      username: 'user@corp.com',
      homeAccountId: 'abc',
      environment: 'login.microsoftonline.com',
      tenantId: 'tenant',
      localAccountId: 'local',
    }
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([fakeAccount])
    const silentSpy = vi
      .spyOn(msalModule.msalInstance!, 'acquireTokenSilent')
      .mockResolvedValue(makeAuthResult('tok', fakeAccount))

    await msalModule.getAccessToken()

    expect(silentSpy).toHaveBeenCalledWith(expect.objectContaining({ account: fakeAccount }))
  })
})
