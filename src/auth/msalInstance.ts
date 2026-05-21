import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, graphScopes } from './msalConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

/**
 * Acquires a fresh Microsoft access token via silent refresh.
 * Throws if no account is signed in — callers should check isAuthenticated first.
 */
export async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) throw new Error('Not authenticated — no MSAL account')
  const result = await msalInstance.acquireTokenSilent({
    scopes: graphScopes,
    account: accounts[0],
  })
  return result.accessToken
}
