import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import { ErrorBoundary } from './shared/ErrorBoundary'
import './index.css'

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
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
