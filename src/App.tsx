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
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <nav className="flex w-56 flex-col gap-1 border-r bg-white p-4 pt-6" aria-label="Main navigation">
        <span className="mb-6 px-2 text-lg font-bold tracking-tight">Timetracker</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentPath === item.to
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App
