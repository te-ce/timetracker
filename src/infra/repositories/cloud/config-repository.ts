import type { StorageAdapter } from '../../storage/adapter'
import type { AppConfig, ConfigRepository } from '../types'
import { DEFAULT_APP_CONFIG } from '../../../shared/appConfigDefaults'
import { appConfigSchema } from '../configSchema'

const KEY = 'config.json'

export class CloudConfigRepository implements ConfigRepository {
  private adapter: StorageAdapter
  private cache: AppConfig | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async get(): Promise<AppConfig> {
    if (this.cache) return structuredClone(this.cache)
    const raw = await this.adapter.get<unknown>(KEY)
    if (raw !== null) {
      const parsed = appConfigSchema.safeParse(raw)
      if (parsed.success) {
        const data: unknown = parsed.data
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.cache = data as AppConfig
      } else {
        console.warn('[CloudConfigRepository] Stored config failed validation, using defaults', parsed.error.issues)
        this.cache = structuredClone(DEFAULT_APP_CONFIG)
      }
    } else {
      this.cache = structuredClone(DEFAULT_APP_CONFIG)
    }
    return structuredClone(this.cache)
  }

  async save(config: AppConfig): Promise<void> {
    this.cache = structuredClone(config)
    await this.adapter.put(KEY, config)
  }

  clearCache(): void {
    this.cache = null
  }
}
