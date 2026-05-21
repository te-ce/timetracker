import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalInstance.ts'
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

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)

createRoot(rootElement).render(
  msalInstance ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app,
)
