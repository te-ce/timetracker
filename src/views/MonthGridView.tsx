import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { InMemoryTimeEntryRepository, InMemoryWorkWindowRepository, InMemoryConfigRepository } from '../repositories/in-memory'
import { MonthGrid } from '../components/MonthGrid'

// Temporary in-memory repos until Firestore is wired
const timeEntryRepo = new InMemoryTimeEntryRepository()
const workWindowRepo = new InMemoryWorkWindowRepository()
const configRepo = new InMemoryConfigRepository()

export function MonthGridView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">←</button>
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <button onClick={nextMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">→</button>
        <button
          onClick={() => { const now = new Date(); setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}
          className="rounded border px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Today
        </button>
      </div>
      <MonthGrid
        year={year}
        month={month}
        timeEntryRepository={timeEntryRepo}
        workWindowRepository={workWindowRepo}
        autoCategory={config?.autoCategory ?? 'Coremedia'}
        customCategories={config?.customCategories ?? []}
      />
    </div>
  )
}
