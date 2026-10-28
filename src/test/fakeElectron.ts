import preloadSource from '../../electron/preload.cjs?raw'

type IpcListener = (event: unknown, ...args: unknown[]) => void

// contextBridge hands the other world a fresh proxy every time a function crosses
// it, so the same renderer callback passed to on* and off* arrives as two
// different functions in the preload. Mirror that here or identity-based
// bookkeeping in the preload looks correct in tests and leaks in the app.
function crossBridge(value: unknown): unknown {
  if (typeof value === 'function') {
    return (...args: unknown[]) => crossBridge(Reflect.apply(value, undefined, args.map(crossBridge)))
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Promise)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, crossBridge(v)]))
  }
  return value
}

function isElectronAPI(value: unknown): value is NonNullable<Window['electronAPI']> {
  return value !== null && typeof value === 'object' && 'tray' in value && 'window' in value
}

// Runs the real electron/preload.cjs against a fake ipcRenderer, so tests
// exercise the actual on/off wiring rather than a hand-written stand-in.
export async function makeElectronAPI() {
  const listeners = new Map<string, IpcListener[]>()
  const sent: Array<{ channel: string; data: unknown }> = []
  const ipcRenderer = {
    on: (channel: string, listener: IpcListener) => {
      listeners.set(channel, [...(listeners.get(channel) ?? []), listener])
    },
    removeListener: (channel: string, listener: IpcListener) => {
      const current = listeners.get(channel) ?? []
      const index = current.indexOf(listener)
      if (index >= 0)
        listeners.set(
          channel,
          current.filter((_, i) => i !== index),
        )
    },
    send: (channel: string, data: unknown) => {
      sent.push({ channel, data })
    },
    invoke: () => Promise.resolve(null),
  }
  let exposed: unknown
  const electron = {
    contextBridge: {
      exposeInMainWorld: (_key: string, api: unknown) => {
        exposed = crossBridge(api)
      },
    },
    ipcRenderer,
  }
  const moduleUrl = `data:text/javascript,${encodeURIComponent(`export default (require) => {${preloadSource}}`)}`
  const preload: { default: (require: () => unknown) => void } = await import(/* @vite-ignore */ moduleUrl)
  preload.default(() => electron)
  if (!isElectronAPI(exposed)) throw new Error('preload did not expose electronAPI')
  return {
    api: exposed,
    emit: (channel: string, ...args: unknown[]) => {
      for (const listener of listeners.get(channel) ?? []) listener({}, ...args)
    },
    listenerCount: (channel: string) => listeners.get(channel)?.length ?? 0,
    traySyncCount: () => sent.filter((m) => m.channel === 'tray:sync').length,
  }
}
