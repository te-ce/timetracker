import type { StorageAdapter } from '../../storage/adapter'
import type { AppConfig, ConfigRepository } from '../types'
import { DEFAULT_APP_CONFIG } from '../../domain/appConfigDefaults'

const KEY = 'config.json'

export class CloudConfigRepository implements ConfigRepository {
  private adapter: StorageAdapter
  private cache: AppConfig | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async get(): Promise<AppConfig> {
    if (this.cache) return { ...this.cache }
    const data = await this.adapter.get<AppConfig>(KEY)
    this.cache = data ?? { ...DEFAULT_APP_CONFIG }
    return { ...this.cache }
  }

  async save(config: AppConfig): Promise<void> {
    this.cache = { ...config }
    await this.adapter.put(KEY, config)
  }

  clearCache(): void {
    this.cache = null
  }
}
