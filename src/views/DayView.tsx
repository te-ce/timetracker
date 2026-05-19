import { InMemoryWorkWindowRepository, InMemoryTimeEntryRepository } from '../repositories/in-memory'
import { WorkWindowPanel } from '../components/WorkWindowPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { useAppStore } from '../stores/appStore'

// Temporary in-memory repos until Firestore + MSAL auth is wired
const workWindowRepo = new InMemoryWorkWindowRepository()
const timeEntryRepo = new InMemoryTimeEntryRepository()

const SOLLSTUNDEN = 8 // TODO: load from ConfigRepository

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DayView() {
  const { selectedDate, setSelectedDate } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() - 1)
            setSelectedDate(d.toISOString().slice(0, 10))
          }}
        >
          ← Prev
        </button>
        <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
        <button
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            setSelectedDate(d.toISOString().slice(0, 10))
          }}
        >
          Next →
        </button>
      </div>

      <WorkWindowPanel
        date={selectedDate}
        sollstunden={SOLLSTUNDEN}
        repository={workWindowRepo}
      />

      <TimeEntryPanel
        date={selectedDate}
        repository={timeEntryRepo}
      />
    </div>
  )
}
