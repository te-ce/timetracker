import type { AppConfig, ConfigRepository } from '../types'

export const defaultAppConfig: AppConfig = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 10,
  sprintStartDate: null,
  customCategories: [],
}

export class InMemoryConfigRepository implements ConfigRepository {
  private config: AppConfig

  constructor(initialConfig: AppConfig = defaultAppConfig) {
    this.config = { ...initialConfig }
  }

  get(): Promise<AppConfig> {
    return Promise.resolve({ ...this.config })
  }

  save(config: AppConfig): Promise<void> {
    this.config = { ...config }

    return Promise.resolve()
  }
}
