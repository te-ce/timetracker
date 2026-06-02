import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalInstance.ts'
import { readBootstrapConfig, isSetupSkipped, isLocalFolderMode } from './auth/bootstrapConfig.ts'
import { SetupWizard } from './components/SetupWizard.tsx'
import { useMsalSync } from './hooks/useMsalSync.ts'
import { RepositoryProvider } from './repositories/RepositoryContext.tsx'
import { router } from './routes/router.ts'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 },
  },
})

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import('./mocks/browser.ts')
  void worker.start({ onUnhandledRequest: 'bypass' })
}

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element not found')
}

void enableMocking()

const needsSetup = !readBootstrapConfig() && !isSetupSkipped() && !isLocalFolderMode()

// eslint-disable-next-line react-refresh/only-export-components
function MsalSync() {
  useMsalSync()
  return null
}

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
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
  ) : app
}

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
