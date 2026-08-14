import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import {
  acceleratorFromKeyEvent,
  defaultHotkeyConfig,
  getEffectiveShortcut,
  HOTKEY_DEFAULTS,
  type HotkeyConfig,
  type InAppShortcutAction,
} from '../../shared/hotkeyConfig'

interface Props {
  repository: ConfigRepository
}

const ACTION_LABELS: Record<InAppShortcutAction, string> = {
  monthView: 'Month view',
  tableView: 'Table view',
  dayView: 'Day view',
  sprintView: 'Sprint view',
  today: 'Jump to today',
  prevDay: 'Previous day',
  nextDay: 'Next day',
  undo: 'Undo',
  redo: 'Redo',
  toggleLegend: 'Toggle legend',
}

const IN_APP_ACTIONS: InAppShortcutAction[] = [
  'monthView',
  'tableView',
  'dayView',
  'sprintView',
  'today',
  'prevDay',
  'nextDay',
  'undo',
  'redo',
  'toggleLegend',
]

function KeyCaptureField({
  currentKey,
  onCapture,
  actionLabel,
  captureValue = (e) => e.key,
}: {
  currentKey: string | null
  onCapture: (key: string) => void
  actionLabel: string
  captureValue?: (e: React.KeyboardEvent<HTMLInputElement>) => string | null
}) {
  const [recording, setRecording] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (recording) inputRef.current?.focus()
  }, [recording])

  if (recording) {
    return (
      <input
        ref={inputRef}
        type="text"
        aria-label="Press a key"
        readOnly
        placeholder="Press a key…"
        className="w-32 rounded border px-2 py-1 text-sm text-center dark:bg-gray-700 dark:border-gray-500"
        onKeyDown={(e) => {
          e.preventDefault()
          const value = captureValue(e)
          if (value === null) return
          onCapture(value)
          setRecording(false)
        }}
        onBlur={() => setRecording(false)}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={`Change ${actionLabel} shortcut`}
      onClick={() => setRecording(true)}
      className="rounded border px-2 py-1 text-sm dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {currentKey === null ? <span className="text-gray-400">disabled</span> : <kbd>{currentKey}</kbd>}
    </button>
  )
}

function captureAccelerator(e: React.KeyboardEvent<HTMLInputElement>): string | null {
  return acceleratorFromKeyEvent(e)
}

export function HotkeySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const isElectron = Boolean(window.electronAPI)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (hotkeys: HotkeyConfig) => repository.save({ ...config!, hotkeys }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const hotkeys: HotkeyConfig = config.hotkeys ?? defaultHotkeyConfig()

  function saveInApp(action: InAppShortcutAction, value: string | null) {
    mutation.mutate({ ...hotkeys, inApp: { ...hotkeys.inApp, [action]: value } })
  }

  function saveGlobal(value: string | null) {
    void mutation
      .mutateAsync({ ...hotkeys, globalToggle: value })
      .then(() => window.electronAPI?.hotkey.setGlobal(value))
  }

  function savePresentingMode(value: string | null) {
    void mutation
      .mutateAsync({ ...hotkeys, presentingMode: value })
      .then(() => window.electronAPI?.hotkey.setPresenting(value))
  }

  return (
    <div className="flex flex-col gap-6">
      {isElectron && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold dark:text-gray-100">Global hotkey</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-gray-300">Toggle tracking</span>
            <div className="flex items-center gap-2">
              <KeyCaptureField
                currentKey={hotkeys.globalToggle}
                actionLabel="Toggle tracking"
                captureValue={captureAccelerator}
                onCapture={(value) => saveGlobal(value)}
              />
              {hotkeys.globalToggle !== null && (
                <button
                  type="button"
                  aria-label="Disable global hotkey"
                  onClick={() => saveGlobal(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Disable
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-gray-300">Toggle privacy mode</span>
            <div className="flex items-center gap-2">
              <KeyCaptureField
                currentKey={hotkeys.presentingMode}
                actionLabel="privacy mode"
                captureValue={captureAccelerator}
                onCapture={(value) => savePresentingMode(value)}
              />
              {hotkeys.presentingMode !== null && (
                <button
                  type="button"
                  aria-label="Disable privacy mode shortcut"
                  onClick={() => savePresentingMode(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Disable
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold dark:text-gray-100">In-app shortcuts</h3>
        <div className="flex flex-col gap-2">
          {IN_APP_ACTIONS.map((action) => {
            const effective = getEffectiveShortcut(hotkeys, action)
            return (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-300">{ACTION_LABELS[action]}</span>
                <div className="flex items-center gap-2">
                  <KeyCaptureField
                    currentKey={effective}
                    actionLabel={ACTION_LABELS[action]}
                    onCapture={(key) => saveInApp(action, key)}
                  />
                  {effective !== null && (
                    <button
                      type="button"
                      aria-label={`Disable ${ACTION_LABELS[action]} shortcut`}
                      onClick={() => saveInApp(action, null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Disable
                    </button>
                  )}
                  {effective === null && (
                    <button
                      type="button"
                      aria-label={`Re-enable ${ACTION_LABELS[action]} shortcut`}
                      onClick={() => saveInApp(action, HOTKEY_DEFAULTS.inApp[action])}
                      className="text-xs text-indigo-500 hover:text-indigo-700"
                    >
                      Re-enable
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
