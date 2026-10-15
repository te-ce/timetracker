import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InteractionRequiredAuthError, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser'
import { useSyncStatus } from '../storage/sync-status'

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

const account: AccountInfo = {
  username: 'user@corp.com',
  homeAccountId: 'abc',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant',
  localAccountId: 'local',
}

describe('msal configuration', () => {
  it('keeps the token cache in localStorage so sign-in survives an app restart', () => {
    expect(msalModule.msalInstance!.getConfiguration().cache.cacheLocation).toBe('localStorage')
  })
})

describe('interaction-required token failures', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useSyncStatus.setState({ signInRequired: false })
  })

  it('flags that sign-in is required and still rejects', async () => {
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([account])
    vi.spyOn(msalModule.msalInstance!, 'acquireTokenSilent').mockRejectedValue(
      new InteractionRequiredAuthError('interaction_required', 'consent needed'),
    )
    await expect(msalModule.getAccessToken()).rejects.toBeInstanceOf(InteractionRequiredAuthError)
    expect(useSyncStatus.getState().signInRequired).toBe(true)
  })

  it('does not flag sign-in for other failures (e.g. offline)', async () => {
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([account])
    vi.spyOn(msalModule.msalInstance!, 'acquireTokenSilent').mockRejectedValue(new Error('network'))
    await expect(msalModule.getAccessToken()).rejects.toThrow('network')
    expect(useSyncStatus.getState().signInRequired).toBe(false)
  })

  it('signInAgain acquires a token interactively and clears the flag', async () => {
    useSyncStatus.setState({ signInRequired: true })
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([account])
    const popupSpy = vi
      .spyOn(msalModule.msalInstance!, 'acquireTokenPopup')
      .mockResolvedValue(makeAuthResult('fresh', account))

    await msalModule.signInAgain()

    expect(popupSpy).toHaveBeenCalledWith(expect.objectContaining({ scopes: msalModule.graphScopes, account }))
    expect(useSyncStatus.getState().signInRequired).toBe(false)
  })

  it('clears the flag once a silent token succeeds again', async () => {
    useSyncStatus.setState({ signInRequired: true })
    vi.spyOn(msalModule.msalInstance!, 'getAllAccounts').mockReturnValue([account])
    vi.spyOn(msalModule.msalInstance!, 'acquireTokenSilent').mockResolvedValue(makeAuthResult('tok', account))
    await msalModule.getAccessToken()
    expect(useSyncStatus.getState().signInRequired).toBe(false)
  })
})
