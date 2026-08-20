import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from '../infra/auth/msalInstance'
import { readBootstrapConfig, isSetupSkipped, isLocalFolderMode } from '../infra/auth/bootstrapConfig'
import { SetupWizard } from '../features/settings/SetupWizard'
import { RepositoryProvider } from '../infra/repositories/RepositoryContext'
import { router } from '../routes/router.ts'
import { MsalSync } from './MsalSync'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 },
  },
})

// Read once, at module load: whether the setup wizard is owed is a property of how
// the app was started, not something a re-render should reconsider.
const needsSetup = !readBootstrapConfig() && !isSetupSkipped() && !isLocalFolderMode()

/** Everything above the router: setup gate, repositories, query client, and MSAL. */
export function Root() {
  const [showSetup, setShowSetup] = useState(needsSetup)

  if (showSetup) {
    return <SetupWizard onSkip={() => setShowSetup(false)} />
  }

  const app = (
    <RepositoryProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </RepositoryProvider>
  )

  return msalInstance ? (
    <MsalProvider instance={msalInstance}>
      <MsalSync />
      {app}
    </MsalProvider>
  ) : (
    app
  )
}
