import { useQuery } from '@tanstack/react-query'
import { InMemoryWorkWindowRepository, InMemoryTimeEntryRepository, InMemoryConfigRepository, InMemoryWorkLocationRepository } from '../repositories/in-memory'
import { WorkWindowPanel } from '../components/WorkWindowPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { AutoCategoryRow } from '../components/AutoCategoryRow'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateRestarbeitszeit } from '../domain/worktime'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { useAppStore } from '../stores/appStore'
import type { WorkLocation } from '../repositories/types'

// Temporary in-memory repos until Firestore + MSAL auth is wired
const workWindowRepo = new InMemoryWorkWindowRepository()
const timeEntryRepo = new InMemoryTimeEntryRepository()
const configRepo = new InMemoryConfigRepository()
const workLocationRepo = new InMemoryWorkLocationRepository()

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

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', selectedDate],
    queryFn: () => workWindowRepo.findByDate(new Date(selectedDate)),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', selectedDate],
    queryFn: () => {
      const d = new Date(selectedDate)
      return timeEntryRepo.findByDateRange(d, d)
    },
  })

  const { data: workLocation = null } = useQuery({
    queryKey: ['workLocation', selectedDate],
    queryFn: () => workLocationRepo.findByDate(selectedDate),
  })

  const sollstunden = config?.sollstunden ?? 8
  const workedHours = calculateWorkedHours(windows)
  const manualTotal = entries.reduce((sum, e) => sum + e.hours, 0)
  const restarbeitszeit = calculateRestarbeitszeit(sollstunden, workedHours)

  const autoCategory = resolveAutoCategory({
    date: selectedDate,
    globalDefault: config?.autoCategory ?? null,
    dayOverrides: new Map(),
  })

  function handleLocationToggle() {
    const next: WorkLocation | null =
      workLocation === null ? 'Office' : workLocation === 'Office' ? 'Remote' : null
    if (next) {
      void workLocationRepo.save(selectedDate, next)
    } else {
      void workLocationRepo.delete(selectedDate)
    }
  }

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

      <div className="flex items-center gap-4">
        <button
          onClick={handleLocationToggle}
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
          aria-label="Work location"
        >
          {workLocation === 'Office' ? '🏢 Office' : workLocation === 'Remote' ? '🏠 Remote' : '📍 Set location'}
        </button>
        {workedHours > 0 && (
          <span className={`text-sm font-medium ${restarbeitszeit.isOvertime ? 'text-green-600' : 'text-amber-600'}`}>
            {restarbeitszeit.isOvertime ? 'Overtime' : 'Remaining'}: {Math.abs(restarbeitszeit.value).toFixed(1)}h
          </span>
        )}
      </div>

      <WorkWindowPanel
        date={selectedDate}
        sollstunden={sollstunden}
        repository={workWindowRepo}
      />

      <AutoCategoryRow
        autoCategory={autoCategory}
        workedHours={workedHours}
        manualTotal={manualTotal}
      />

      <TimeEntryPanel
        date={selectedDate}
        repository={timeEntryRepo}
        customCategories={config?.customCategories ?? []}
      />
    </div>
  )
}
