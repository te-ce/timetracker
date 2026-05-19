import './App.css'
import { DayView } from './views/DayView'

const NAV_ITEMS = [
  { label: 'Day', icon: '📅' },
  { label: 'Month', icon: '📆' },
  { label: 'Sprint', icon: '⚡' },
  { label: 'Settings', icon: '⚙️' },
]

function App() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <nav className="flex w-56 flex-col gap-1 border-r bg-white p-4 pt-6" aria-label="Main navigation">
        <span className="mb-6 px-2 text-lg font-bold tracking-tight">Timetracker</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 first-of-type:bg-indigo-50 first-of-type:text-indigo-700"
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8">
        <DayView />
      </main>
    </div>
  )
}

export default App
