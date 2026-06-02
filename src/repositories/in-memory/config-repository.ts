import type { AppConfig, ConfigRepository } from '../types'

export const defaultAppConfig: AppConfig = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 10,
  sprintStartDate: null,
  customCategories: [],
  sharepointUrl: null,
  targetSheet: null,
  categoryMapping: {},
}

export class InMemoryConfigRepository implements ConfigRepository {
  private config: AppConfig

  constructor(initialConfig: AppConfig = defaultAppConfig) {
    this.config = structuredClone(initialConfig)
  }

  get(): Promise<AppConfig> {
    return Promise.resolve(structuredClone(this.config))
  }

  save(config: AppConfig): Promise<void> {
    this.config = structuredClone(config)
    return Promise.resolve()
  }
}
