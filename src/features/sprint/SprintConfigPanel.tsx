import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import type { AppConfig } from '../../infra/repositories/configSchema'
import { SprintExportControls } from './SprintExportControls'
import type { ExportStatus, SprintRoundingMode } from './sprint'

function isSprintRoundingMode(value: string): value is SprintRoundingMode {
  return value === 'nearest' || value === 'up' || value === 'down'
}

function parseSprintLength(value: string): number | null {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= 1 ? n : null
}

const ROUNDING_STEPS = [0, 0.1, 0.25, 0.5, 1]

interface DraftState {
  startDate: string
  lengthDays: string
  roundingStep: number
  roundingMode: SprintRoundingMode
}

function isDraftDirty(draft: DraftState, config: AppConfig | undefined): boolean {
  if (!config) return false
  return (
    draft.startDate !== (config.sprintStartDate ?? '') ||
    draft.lengthDays !== String(config.sprintLengthDays) ||
    draft.roundingStep !== (config.sprintRoundingStep ?? 0) ||
    draft.roundingMode !== (config.sprintRoundingMode ?? 'nearest')
  )
}

interface Props {
  repository: ConfigRepository
  onConfigChanged?: () => void
  exportStatus?: ExportStatus | undefined
  exportReady?: boolean | undefined
  onExport?: ((overwrite: boolean) => Promise<void>) | undefined
}

export function SprintConfigPanel({ repository, onConfigChanged, exportStatus, exportReady, onExport }: Props) {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState('')
  const [lengthDays, setLengthDays] = useState('')
  const [roundingStep, setRoundingStep] = useState(0)
  const [roundingMode, setRoundingMode] = useState<SprintRoundingMode>('nearest')
  const initialized = useRef(false)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  useEffect(() => {
    if (config && !initialized.current) {
      setStartDate(config.sprintStartDate ?? '')
      setLengthDays(String(config.sprintLengthDays))
      setRoundingStep(config.sprintRoundingStep ?? 0)
      setRoundingMode(config.sprintRoundingMode ?? 'nearest')
      initialized.current = true
    }
  }, [config])

  const parsedLength = parseSprintLength(lengthDays)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!config || parsedLength === null) return
      await repository.save({
        ...config,
        sprintStartDate: startDate || null,
        sprintLengthDays: parsedLength,
        sprintRoundingStep: roundingStep,
        sprintRoundingMode: roundingMode,
      })
    },
    onSuccess: () => {
      invalidateConfig(queryClient)
      onConfigChanged?.()
    },
  })

  function requestSave() {
    if (parsedLength !== null) saveMutation.mutate()
  }

  const isDirty = isDraftDirty({ startDate, lengthDays, roundingStep, roundingMode }, config)

  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-gray-200 pb-3 dark:border-gray-700">
      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span aria-hidden>📅</span>
        Start
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') requestSave()
          }}
          className="border-0 border-b border-gray-300 bg-transparent px-0 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span aria-hidden>#</span>
        Length
        <input
          type="number"
          aria-label="Length"
          min="1"
          value={lengthDays}
          onChange={(e) => setLengthDays(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') requestSave()
          }}
          className="w-10 border-0 border-b border-gray-300 bg-transparent px-0 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
        />
        <span className="text-gray-400 dark:text-gray-500">days</span>
        {config && parsedLength === null && (
          <span role="alert" className="text-xs text-red-600">
            Enter a whole number of at least 1
          </span>
        )}
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        Round to
        <select
          aria-label="Rounding step"
          value={roundingStep}
          onChange={(e) => setRoundingStep(Number(e.target.value))}
          className="border-0 border-b border-gray-300 bg-transparent py-1 pl-0 pr-4 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
        >
          {ROUNDING_STEPS.map((step) => (
            <option key={step} value={step}>
              {step === 0 ? 'Off' : step}
            </option>
          ))}
        </select>
        {roundingStep > 0 && (
          <select
            aria-label="Rounding mode"
            value={roundingMode}
            onChange={(e) => {
              if (isSprintRoundingMode(e.target.value)) setRoundingMode(e.target.value)
            }}
            className="border-0 border-b border-gray-300 bg-transparent py-1 pl-0 pr-4 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="nearest">Nearest</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        )}
      </label>

      {isDirty && (
        <button
          type="button"
          onClick={requestSave}
          disabled={saveMutation.isPending || parsedLength === null}
          className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
        >
          Save
        </button>
      )}

      {onExport && <SprintExportControls exportStatus={exportStatus} exportReady={exportReady} onExport={onExport} />}
    </div>
  )
}
