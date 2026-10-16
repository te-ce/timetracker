import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import { ErrorBoundary } from './shared/ErrorBoundary'
import { installActionLogging } from './shared/actionLog'
import { log } from './shared/log'
import { router } from './routes/router.ts'
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

log.info('app:start', { mode: import.meta.env.MODE, electron: Boolean(window.electronAPI) })
installActionLogging(window)
router.subscribe('onResolved', (e) => log.info('ui:navigate', { from: e.fromLocation?.href, to: e.toLocation.href }))

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
