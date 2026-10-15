import type { Configuration } from '@azure/msal-browser'
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'
import { readBootstrapConfig } from './bootstrapConfig'
import { useSyncStatus } from '../storage/sync-status'

/**
 * Scopes required for Microsoft Graph API. Files.ReadWrite.All (not just
 * Files.ReadWrite.AppFolder) is needed for the SharePoint Excel export — see ADR 0005.
 */
export const graphScopes = ['User.Read', 'Files.ReadWrite.All']

const bootstrapConfig = readBootstrapConfig()

function buildMsalConfig(): Configuration | null {
  if (!bootstrapConfig) return null
  return {
    auth: {
      clientId: bootstrapConfig.clientId,
      authority: `https://login.microsoftonline.com/${bootstrapConfig.tenantId}`,
      redirectUri: window.location.origin,
    },
    cache: {
      // sessionStorage lost the refresh token on every restart (Electron quit,
      // closed tab), so sync silently stopped until the user signed in again.
      cacheLocation: 'localStorage',
    },
  }
}

const config = buildMsalConfig()

/** null when no BootstrapConfig is present (app runs in local-only mode) */
export const msalInstance: PublicClientApplication | null = config ? new PublicClientApplication(config) : null

function signedInAccount(instance: PublicClientApplication) {
  const accounts = instance.getAllAccounts()
  if (accounts.length === 0) throw new Error('Not authenticated — no MSAL account')
  return accounts[0] ? { account: accounts[0] } : {}
}

/**
 * Acquires a fresh Microsoft access token via silent refresh.
 * Throws if no account is signed in — callers should check isAuthenticated first.
 * When the refresh needs user interaction, flags `signInRequired` so the header
 * can offer a sign-in button (a popup cannot be opened from a background call).
 */
export async function getAccessToken(): Promise<string> {
  if (!msalInstance) throw new Error('MSAL not configured — run the Setup Wizard first')
  const account = signedInAccount(msalInstance)
  try {
    const result = await msalInstance.acquireTokenSilent({ scopes: graphScopes, ...account })
    if (useSyncStatus.getState().signInRequired) useSyncStatus.setState({ signInRequired: false })
    return result.accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) useSyncStatus.setState({ signInRequired: true })
    throw e
  }
}

/** Interactive token refresh; must be called from a user gesture (click). */
export async function signInAgain(): Promise<void> {
  if (!msalInstance) return
  await msalInstance.acquireTokenPopup({ scopes: graphScopes, ...signedInAccount(msalInstance) })
  useSyncStatus.setState({ signInRequired: false })
}
