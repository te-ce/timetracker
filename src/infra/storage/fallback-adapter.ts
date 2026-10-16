import { StorageConflictError, type StorageAdapter } from './adapter'
import { log } from '../../shared/log'

const PENDING_KEY = 'sync-pending.json'

/**
 * Composite adapter: primary (OneDrive) is the source of truth, fallback
 * (localStorage / Electron userData) is the offline copy.
 *
 * A write that cannot reach the primary is kept as a pending key (persisted in
 * the fallback). While a key is pending its local copy wins over the primary
 * and every read or `flush()` retries the upload. See ADR 0013.
 *
 * A conflict on a live write is passed to the caller (it re-reads and
 * re-applies its change); a conflict while replaying an offline write keeps
 * the local version (last write wins, with a warning).
 */
export class FallbackStorageAdapter implements StorageAdapter {
  private primary: StorageAdapter
  private fallback: StorageAdapter
  private onPendingChange: (count: number) => void
  private pending: Set<string> | null = null
  private chains = new Map<string, Promise<unknown>>()

  constructor(
    primary: StorageAdapter,
    fallback: StorageAdapter,
    onPendingChange: (count: number) => void = () => undefined,
  ) {
    this.primary = primary
    this.fallback = fallback
    this.onPendingChange = onPendingChange
  }

  get<T>(key: string): Promise<T | null> {
    return this.serialize(key, () => this.read<T>(key))
  }

  put<T>(key: string, data: T): Promise<void> {
    return this.serialize(key, async () => {
      await this.fallback.put(key, data)
      await this.setPending(key, true)
      await this.push(key, data, 'throw')
    })
  }

  delete(key: string): Promise<void> {
    return this.serialize(key, async () => {
      await this.fallback.delete(key)
      await this.setPending(key, true)
      await this.push(key, null, 'throw')
    })
  }

  /** Retries every pending upload; keys that still fail stay pending. */
  async flush(): Promise<void> {
    const keys = [...(await this.loadPending())]
    await Promise.all(
      keys.map((key) =>
        this.serialize(key, async () => {
          if (this.pending?.has(key)) await this.push(key, await this.fallback.get(key), 'overwrite')
        }),
      ),
    )
  }

  pendingCount(): number {
    return this.pending?.size ?? 0
  }

  private async read<T>(key: string): Promise<T | null> {
    if ((await this.loadPending()).has(key)) {
      const local = await this.fallback.get<T>(key)
      await this.push(key, local, 'overwrite')
      return local
    }
    let remote: T | null
    try {
      remote = await this.primary.get<T>(key)
    } catch (e) {
      log.warn('sync: remote read failed, using local copy', { key, error: e })
      return this.fallback.get<T>(key)
    }
    await this.mirror(key, remote)
    return remote
  }

  private async mirror(key: string, remote: unknown): Promise<void> {
    try {
      if (remote === null) await this.fallback.delete(key)
      else await this.fallback.put(key, remote)
    } catch (e) {
      log.warn('sync: could not mirror remote copy locally', { key, error: e })
    }
  }

  private async push(key: string, data: unknown, onConflict: 'throw' | 'overwrite'): Promise<void> {
    try {
      await this.upload(key, data)
    } catch (e) {
      if (!(e instanceof StorageConflictError)) {
        log.warn('sync: upload failed, write stays pending', { key, error: e })
        return
      }
      if (onConflict === 'throw') {
        await this.setPending(key, false)
        throw e
      }
      log.warn('sync: changed remotely while offline, keeping the local version', { key })
      try {
        await this.primary.get(key)
        await this.upload(key, data)
      } catch {
        return
      }
    }
    await this.setPending(key, false)
  }

  private async upload(key: string, data: unknown): Promise<void> {
    if (data === null) await this.primary.delete(key)
    else await this.primary.put(key, data)
  }

  private async loadPending(): Promise<Set<string>> {
    if (!this.pending) {
      const stored = await this.fallback.get<unknown>(PENDING_KEY)
      this.pending = new Set(Array.isArray(stored) ? stored.filter((k): k is string => typeof k === 'string') : [])
      this.onPendingChange(this.pending.size)
    }
    return this.pending
  }

  private async setPending(key: string, isPending: boolean): Promise<void> {
    const pending = await this.loadPending()
    if (pending.has(key) === isPending) return
    if (isPending) pending.add(key)
    else pending.delete(key)
    await this.fallback.put(PENDING_KEY, [...pending])
    this.onPendingChange(pending.size)
  }

  private serialize<R>(key: string, task: () => Promise<R>): Promise<R> {
    const run = (this.chains.get(key) ?? Promise.resolve()).then(task, task)
    const tail = run.then(
      () => undefined,
      () => undefined,
    )
    this.chains.set(key, tail)
    void tail.then(() => {
      if (this.chains.get(key) === tail) this.chains.delete(key)
    })
    return run
  }
}
