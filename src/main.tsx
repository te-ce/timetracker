import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalInstance.ts'
import { readBootstrapConfig, isSetupSkipped } from './auth/bootstrapConfig.ts'
import { SetupWizard } from './components/SetupWizard.tsx'
import { useMsalSync } from './hooks/useMsalSync.ts'
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

const needsSetup = !readBootstrapConfig() && !isSetupSkipped()

/** Mounts useMsalSync — only rendered inside <MsalProvider> */
function MsalSync() {
  useMsalSync()
  return null
}

function Root() {
  const [showSetup, setShowSetup] = useState(needsSetup)

  if (showSetup) {
    return <SetupWizard onSkip={() => setShowSetup(false)} />
  }

  const app = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
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
