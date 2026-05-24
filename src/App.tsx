import './App.css'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { msalInstance } from './auth/msalInstance'

const NAV_ITEMS: { label: string; icon: string; to: string }[] = [
  { label: 'Month', icon: '📆', to: '/' },
  { label: 'Grid', icon: '📊', to: '/grid' },
  { label: 'Day', icon: '📅', to: '/day' },
  { label: 'Sprint', icon: '⚡', to: '/sprint' },
  { label: 'Settings', icon: '⚙️', to: '/settings' },
]

function SyncIndicator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!msalInstance) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500" title="Microsoft not configured — local only">
        <span aria-label="Local only mode">💾</span>
        <span className="hidden sm:inline">Local only</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500"
      title={isAuthenticated ? 'Synced with OneDrive' : 'Offline — sign in to sync'}
    >
      <span aria-label={isAuthenticated ? 'OneDrive sync active' : 'Offline mode'}>
        {isAuthenticated ? '☁️' : '💾'}
      </span>
      <span className="hidden sm:inline">{isAuthenticated ? 'Synced' : 'Offline'}</span>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.166 17.834a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.061-1.06l-1.59-1.591ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.166 6.106a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061L6.166 6.106Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}

function App() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <nav className="flex items-center gap-1 border-b border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800" aria-label="Main navigation">
        <span className="mr-6 text-lg font-bold tracking-tight">Timetracker</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPath === item.to
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <SyncIndicator />
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App
