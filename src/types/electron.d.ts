interface Window {
  electronAPI?: {
    autolaunch: {
      get: () => Promise<boolean>
      set: (enabled: boolean) => Promise<void>
    }
    tray: {
      sync: (data: {
        receiptLines: Array<{ label: string; value: string; isTotal?: boolean; isSubItem?: boolean }>
        badgeLabel: string
        autoCategory: string | null
        activeSubtaskCategory: string | null
        hasLiveSubtask: boolean
        categories: string[]
        isOvertime: boolean
        isTracking: boolean
        startedAt: string | null
        presentingMode: boolean
      }) => void
      onStartSubtask: (cb: (category: string) => void) => () => void
      onStopSubtask: (cb: () => void) => () => void
      onTick: (cb: () => void) => () => void
      onStopAll: (cb: () => void) => () => void
      onStartWorkPeriod: (cb: (category: string) => void) => () => void
      onTogglePresentingMode: (cb: () => void) => () => void
    }
    hotkey: {
      onToggle: (cb: () => void) => () => void
      onTogglePresenting: (cb: () => void) => () => void
      setGlobal: (accelerator: string | null) => Promise<void>
      setPresenting: (accelerator: string | null) => Promise<void>
    }
    storage: {
      get: <T>(key: string) => Promise<T | null>
      put: <T>(key: string, data: T) => Promise<void>
      delete: (key: string) => Promise<void>
    }
    localFolder: {
      pickFolder: () => Promise<string | null>
      get: <T>(basePath: string, key: string) => Promise<T | null>
      put: <T>(basePath: string, key: string, data: T) => Promise<void>
      delete: (basePath: string, key: string) => Promise<void>
    }
    notify: {
      goalReached: () => void
      sprintExportDue: (body: string) => void
    }
    log: {
      write: (entry: import('../shared/log').LogEntry) => void
      read: () => Promise<import('../shared/log').LogEntry[]>
    }
    window: {
      onShow: (cb: () => void) => () => void
      show: () => void
    }
  }
}
