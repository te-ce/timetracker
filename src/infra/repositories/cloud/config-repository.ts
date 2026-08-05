import type { StorageAdapter } from '../../storage/adapter'
import type { AppConfig, ConfigRepository } from '../types'
import { DEFAULT_APP_CONFIG } from '../../../shared/appConfigDefaults'
import { appConfigSchema } from '../configSchema'
import { JsonValueStore } from './json-store'

const KEY = 'config.json'

function validateAppConfig(v: unknown): AppConfig | null {
  const parsed = appConfigSchema.safeParse(v)
  return parsed.success ? parsed.data : null
}

export class CloudConfigRepository implements ConfigRepository {
  private store: JsonValueStore<AppConfig>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonValueStore(adapter, KEY, validateAppConfig, DEFAULT_APP_CONFIG)
  }

  async get(): Promise<AppConfig> {
    return this.store.get()
  }

  async save(config: AppConfig): Promise<void> {
    await this.store.set(config)
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
