import '@testing-library/jest-dom/vitest'
import { Storage } from 'happy-dom'

// Node >= 26 installs its own global `localStorage`/`sessionStorage` getters that
// return undefined unless the process was started with --localstorage-file. They
// shadow the ones happy-dom would define, so every storage-backed test would see
// `undefined`. Give each test file its own fresh happy-dom Storage instead.
for (const key of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, key, { value: new Storage(), configurable: true, writable: true })
}
