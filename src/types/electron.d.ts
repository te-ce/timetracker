interface Window {
  electronAPI?: {
    autolaunch: {
      get(): Promise<boolean>
      set(enabled: boolean): Promise<void>
    }
    tray: {
      sync(data: {
        receiptLines: Array<{ label: string; value: string; isTotal?: boolean; isSubItem?: boolean }>
        badgeLabel: string
        autoCategory: string | null
        activeSubtaskCategory: string | null
        categories: string[]
        isTracking: boolean
        startedAt: string | null
        presentingMode: boolean
      }): void
      onStartSubtask(cb: (category: string) => void): void
      offStartSubtask(cb: (category: string) => void): void
      onStopSubtask(cb: () => void): void
      offStopSubtask(cb: () => void): void
      onStopAll(cb: () => void): void
      offStopAll(cb: () => void): void
      onStartWorkPeriod(cb: (category: string) => void): void
      offStartWorkPeriod(cb: (category: string) => void): void
      onTogglePresentingMode(cb: () => void): void
      offTogglePresentingMode(cb: () => void): void
    }
    hotkey: {
      onToggle(cb: () => void): void
      offToggle(cb: () => void): void
      onTogglePresenting(cb: () => void): void
      offTogglePresenting(cb: () => void): void
      setGlobal(accelerator: string | null): Promise<void>
    }
    storage: {
      get<T>(key: string): Promise<T | null>
      put<T>(key: string, data: T): Promise<void>
      delete(key: string): Promise<void>
    }
    notify: {
      goalReached(): void
      sprintExportDue(body: string): void
    }
    window: {
      onShow(cb: () => void): void
      offShow(cb: () => void): void
    }
  }
}
