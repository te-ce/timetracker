export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]
type Level = LogLevel

export interface LogEntry {
  ts: string
  level: Level
  source: 'main' | 'renderer'
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

// Browser builds have no log file; keep this session's entries for the Logs view.
// ponytail: capped in memory, lost on reload; persist to IndexedDB if browser debugging needs history.
const SESSION_CAP = 2000
const session: LogEntry[] = []

function write(level: Level, event: string, data?: unknown): void {
  try {
    const entry: LogEntry = { ts: new Date().toISOString(), level, source: 'renderer', event }
    const plain = toPlain(data)
    if (plain !== undefined) entry.data = plain
    console[level](`[${level}] ${event}`, ...(plain === undefined ? [] : [plain]))
    if (window.electronAPI) window.electronAPI.log.write(entry)
    else {
      session.push(entry)
      if (session.length > SESSION_CAP) session.shift()
    }
  } catch {
    // Logging must never break the action being logged (e.g. circular data).
  }
}

/** Oldest first: the Electron log files (main + renderer), or this session's entries in a browser. */
export function readLogs(): Promise<LogEntry[]> {
  return window.electronAPI ? window.electronAPI.log.read() : Promise.resolve([...session])
}

/** Writes to the console and, in Electron, to `<userData>/logs/timetracker.log`. */
export const log = {
  debug: (event: string, data?: unknown) => write('debug', event, data),
  info: (event: string, data?: unknown) => write('info', event, data),
  warn: (event: string, data?: unknown) => write('warn', event, data),
  error: (event: string, data?: unknown) => write('error', event, data),
}
