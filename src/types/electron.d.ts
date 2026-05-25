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
      }): void
      onSetCategory(cb: (category: string) => void): void
      offSetCategory(cb: (category: string) => void): void
    }
  }
}
