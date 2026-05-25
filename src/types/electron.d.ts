interface Window {
  electronAPI?: {
    autolaunch: {
      get(): Promise<boolean>
      set(enabled: boolean): Promise<void>
    }
  }
}
