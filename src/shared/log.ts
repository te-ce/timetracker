type Level = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: string
  level: Level
  source: 'renderer'
  event: string
  data?: unknown
}

// Errors serialize to `{}`; spell them out so the log file says what went wrong.
function toPlain(data: unknown): unknown {
  if (data === undefined) return undefined
  const json = JSON.stringify(data, (_key, value: unknown) =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
  )
  return JSON.parse(json)
}

function write(level: Level, event: string, data?: unknown): void {
  try {
    const entry: LogEntry = { ts: new Date().toISOString(), level, source: 'renderer', event }
    const plain = toPlain(data)
    if (plain !== undefined) entry.data = plain
    console[level](`[${level}] ${event}`, ...(plain === undefined ? [] : [plain]))
    window.electronAPI?.log.write(entry)
  } catch {
    // Logging must never break the action being logged (e.g. circular data).
  }
}

/** Writes to the console and, in Electron, to `<userData>/logs/timetracker.log`. */
export const log = {
  debug: (event: string, data?: unknown) => write('debug', event, data),
  info: (event: string, data?: unknown) => write('info', event, data),
  warn: (event: string, data?: unknown) => write('warn', event, data),
  error: (event: string, data?: unknown) => write('error', event, data),
}
