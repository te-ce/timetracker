import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
  onConfigChanged?: () => void
}

export function SprintConfigPanel({ repository, onConfigChanged }: Props) {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState('')
  const [lengthDays, setLengthDays] = useState('')
  const initialized = useRef(false)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  useEffect(() => {
    if (config && !initialized.current) {
      setStartDate(config.sprintStartDate ?? '')
      setLengthDays(String(config.sprintLengthDays))
      initialized.current = true
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!config) return
      await repository.save({
        ...config,
        sprintStartDate: startDate || null,
        sprintLengthDays: parseInt(lengthDays) || config.sprintLengthDays,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      onConfigChanged?.()
    },
  })

  return (
    <div className="flex items-end gap-3 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Start date
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveMutation.mutate()
          }}
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Length (days)
        <input
          type="number"
          aria-label="Length"
          min="1"
          value={lengthDays}
          onChange={(e) => setLengthDays(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveMutation.mutate()
          }}
          className="w-20 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>
      <button
        onClick={() => saveMutation.mutate()}
        className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
      >
        Save
      </button>
    </div>
  )
}
