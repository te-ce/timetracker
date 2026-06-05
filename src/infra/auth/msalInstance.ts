import type { Configuration } from '@azure/msal-browser'
import { PublicClientApplication } from '@azure/msal-browser'
import { readBootstrapConfig } from './bootstrapConfig'

/** Scopes required for Microsoft Graph API (SharePoint Excel access) */
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
      cacheLocation: 'sessionStorage',
    },
  }
}

const config = buildMsalConfig()

/** null when no BootstrapConfig is present (app runs in local-only mode) */
export const msalInstance: PublicClientApplication | null = config ? new PublicClientApplication(config) : null

/**
 * Acquires a fresh Microsoft access token via silent refresh.
 * Throws if no account is signed in — callers should check isAuthenticated first.
 */
export async function getAccessToken(): Promise<string> {
  if (!msalInstance) throw new Error('MSAL not configured — run the Setup Wizard first')
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) throw new Error('Not authenticated — no MSAL account')
  const result = await msalInstance.acquireTokenSilent({
    scopes: graphScopes,
    account: accounts[0],
  })
  return result.accessToken
}
