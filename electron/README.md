# electron/

Electron main process and IPC preload bridge. Wraps the same Vite PWA in a desktop shell with native OS integrations: system tray, launch at login, file system access, window hide-on-close.

## Contents

| File                | Purpose                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `main.cjs`          | Main process — window creation, tray icon, IPC handlers, auto-launch, app lifecycle       |
| `preload.cjs`       | Preload script — exposes a safe `window.electron` API to the renderer via `contextBridge` |
| `icons/tray.png`    | Tray icon (1x)                                                                            |
| `icons/tray@2x.png` | Tray icon (2x / Retina)                                                                   |

## How it works

```
Electron main process (main.cjs)
  └─ BrowserWindow → loads http://localhost:5173 (dev) or dist/index.html (prod)
  └─ contextBridge (preload.cjs) → window.electron.*
       ├─ readFile / writeFile / deleteFile / listFiles  (fs via IPC)
       ├─ getTrayState / setTrayState                    (tray badge sync)
       ├─ setLaunchAtLogin / getLaunchAtLogin            (auto-launch)
       └─ setWindowHideOnClose / getWindowHideOnClose    (window behavior)
```

The renderer uses `ElectronStorageAdapter` (in `src/infra/storage/electron-adapter.ts`) which calls `window.electron.readFile`/`writeFile` etc. over IPC instead of touching `localStorage` or the File System Access API.

`window.electron` is typed in `src/types/electron.d.ts` — extend there when adding new IPC channels.

## Dev vs production

| Mode             | How to run                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| Development      | `npm start` — starts Vite dev server + Electron concurrently             |
| Production build | `npm run electron:build` — bundles app + packages Electron distributable |
