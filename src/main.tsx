import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './auth/msalConfig.ts'
import { router } from './routes/router.ts'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig)
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

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MsalProvider instance={msalInstance}>
        <RouterProvider router={router} />
      </MsalProvider>
    </QueryClientProvider>
  </StrictMode>,
)
