import './App.css'
import { useState } from 'react'
import { DayView } from './views/DayView'
import { MonthView } from './views/MonthView'
import { SprintView } from './views/SprintView'
import { SettingsView } from './views/SettingsView'
import { useAppStore } from './stores/appStore'

type View = 'month' | 'day' | 'sprint' | 'settings'

const NAV_ITEMS: { label: string; icon: string; view: View }[] = [
  { label: 'Month', icon: '📆', view: 'month' },
  { label: 'Day', icon: '📅', view: 'day' },
  { label: 'Sprint', icon: '⚡', view: 'sprint' },
  { label: 'Settings', icon: '⚙️', view: 'settings' },
]

function App() {
  const [activeView, setActiveView] = useState<View>('month')
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)

  function handleDaySelect(date: string) {
    setSelectedDate(date)
    setActiveView('day')
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <nav className="flex w-56 flex-col gap-1 border-r bg-white p-4 pt-6" aria-label="Main navigation">
        <span className="mb-6 px-2 text-lg font-bold tracking-tight">Timetracker</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveView(item.view)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeView === item.view
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8">
        {activeView === 'month' && <MonthView onSelectDate={handleDaySelect} />}
        {activeView === 'day' && <DayView />}
        {activeView === 'sprint' && <SprintView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}

export default App
