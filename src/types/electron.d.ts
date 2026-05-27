interface Window {
  electronAPI?: {
    autolaunch: {
      get(): Promise<boolean>
      set(enabled: boolean): Promise<void>
    }
    tray: {
      sync(data: {
        activeCategory: string | null
        categories: string[]
        startedAt: string | null
        workedHours: number
        remaining: number
        sollstunden: number
        priorOvertime: number
      }): void
      onSetCategory(cb: (category: string) => void): void
      offSetCategory(cb: (category: string) => void): void
    }
    hotkey: {
      onToggle(cb: () => void): void
      offToggle(cb: () => void): void
      setGlobal(accelerator: string | null): Promise<void>
    }
    storage: {
      get<T>(key: string): Promise<T | null>
      put<T>(key: string, data: T): Promise<void>
      delete(key: string): Promise<void>
    }
    notify: {
      goalReached(): void
    }
  }
}
