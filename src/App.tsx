import './App.css'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'

const NAV_ITEMS: { label: string; icon: string; to: string }[] = [
  { label: 'Month', icon: '📆', to: '/' },
  { label: 'Grid', icon: '📊', to: '/grid' },
  { label: 'Day', icon: '📅', to: '/day' },
  { label: 'Sprint', icon: '⚡', to: '/sprint' },
  { label: 'Settings', icon: '⚙️', to: '/settings' },
]

function App() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      {/* Top navigation bar */}
      <nav className="flex items-center gap-1 border-b bg-white px-4 py-2 shadow-sm" aria-label="Main navigation">
        <span className="mr-6 text-lg font-bold tracking-tight">Timetracker</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPath === item.to ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App
