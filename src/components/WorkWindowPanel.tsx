import { useEffect, useState } from 'react'
import type { WorkWindow, WorkWindowRepository } from '../repositories/types'
import { calculateWorkedHours, calculateRestarbeitszeit } from '../domain/worktime'

interface Props {
  date: string
  sollstunden: number
  repository: WorkWindowRepository
}

export function WorkWindowPanel({ date, sollstunden, repository }: Props) {
  const [windows, setWindows] = useState<WorkWindow[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  useEffect(() => {
    void repository.findByDate(new Date(date)).then(setWindows)
  }, [date, repository])

  const workedHours = calculateWorkedHours(windows)
  const restarbeitszeit = calculateRestarbeitszeit(sollstunden, workedHours)

  async function handleAdd() {
    if (!start || !end) return
    const window: WorkWindow = { id: crypto.randomUUID(), date, start, end }
    await repository.save(window)
    setWindows(await repository.findByDate(new Date(date)))
    setStart('')
    setEnd('')
  }

  async function handleRemove(id: string) {
    await repository.delete(id)
    setWindows(await repository.findByDate(new Date(date)))
  }

  return (
    <section aria-label="Work windows">
      <div>
        <label>
          Start
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button onClick={() => void handleAdd()}>Add</button>
      </div>

      {windows.length === 0 ? (
        <p>No work windows recorded</p>
      ) : (
        <>
          <ul>
            {windows.map((w) => (
              <li key={w.id}>
                {w.start}–{w.end}
                <button onClick={() => void handleRemove(w.id)}>Remove</button>
              </li>
            ))}
          </ul>
          <p aria-label="Worked hours">{workedHours}h worked</p>
          <p
            aria-label="Restarbeitszeit"
            data-overtime={restarbeitszeit.isOvertime}
          >
            {restarbeitszeit.value > 0
              ? `${restarbeitszeit.value}h remaining`
              : restarbeitszeit.isOvertime
                ? `${Math.abs(restarbeitszeit.value)}h overtime`
                : 'On target'}
          </p>
        </>
      )}
    </section>
  )
}
