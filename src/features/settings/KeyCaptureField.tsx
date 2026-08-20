import { useState } from 'react'

export function KeyCaptureField({
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

  if (recording) {
    return (
      <input
        // This input exists only while recording, so it mounts already focused.
        autoFocus
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
