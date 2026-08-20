import { useMsalSync } from '../shared/useMsalSync'

/** Keeps the auth store in step with MSAL. Renders nothing; it is here for its effect. */
export function MsalSync() {
  useMsalSync()
  return null
}
