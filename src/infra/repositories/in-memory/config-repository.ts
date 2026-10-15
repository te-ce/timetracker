import type { AppConfig, ConfigRepository } from '../types'
import { DEFAULT_APP_CONFIG } from '../../../shared/appConfigDefaults'

export class InMemoryConfigRepository implements ConfigRepository {
  private config: AppConfig

  constructor(initialConfig: AppConfig = DEFAULT_APP_CONFIG) {
    this.config = structuredClone(initialConfig)
  }

  get(): Promise<AppConfig> {
    return Promise.resolve(structuredClone(this.config))
  }

  save(config: AppConfig): Promise<void> {
    this.config = structuredClone(config)
    return Promise.resolve()
  }

  update(patch: (current: AppConfig) => Partial<AppConfig>): Promise<void> {
    this.config = structuredClone({ ...this.config, ...patch(structuredClone(this.config)) })
    return Promise.resolve()
  }
}
