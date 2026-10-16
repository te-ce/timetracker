const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  globalShortcut,
  Notification,
  dialog,
  powerMonitor,
} = require('electron')
const path = require('path')
const fs = require('fs')
const { readJsonFile, writeJsonFileAtomic, deleteFile, localFolderFile } = require('./json-files.cjs')
const { createLogFile } = require('./log-file.cjs')

const logFile = createLogFile(path.join(app.getPath('userData'), 'logs'))

function log(level, event, data) {
  const entry = { ts: new Date().toISOString(), level, source: 'main', event }
  if (data !== undefined) entry.data = data instanceof Error ? { message: data.message, stack: data.stack } : data
  logFile.write(entry)
}

// Every IPC handler goes through here so each renderer request — and why it failed — lands in the log.
function handle(channel, fn, { logArgs = (args) => args } = {}) {
  ipcMain.handle(channel, async (_, ...args) => {
    try {
      const result = await fn(...args)
      log(channel.endsWith(':get') ? 'debug' : 'info', `ipc ${channel}`, { args: logArgs(args) })
      return result
    } catch (e) {
      log('error', `ipc ${channel}`, { args: logArgs(args), error: { message: e.message, stack: e.stack } })
      throw e
    }
  })
}

// Storage payloads are whole months/configs — log which key, not the content.
const storageArgs = (args) => args[0]
const folderArgs = (args) => args.slice(0, 2)

process.on('uncaughtException', (e) => log('error', 'main:uncaughtException', e))
process.on('unhandledRejection', (e) => log('error', 'main:unhandledRejection', e))

ipcMain.on('log:write', (_, entry) => logFile.write(entry))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null
let elapsedTimer = null
let trayState = {
  receiptLines: [],
  badgeLabel: '',
  autoCategory: null,
  activeSubtaskCategory: null,
  hasLiveSubtask: false,
  categories: [],
  categoryLabels: {},
  isOvertime: false,
  isTracking: false,
  startedAt: null,
  presentingMode: false,
}

const isLaunchAtLoginEnabled = () => app.getLoginItemSettings().openAtLogin
const setLaunchAtLogin = (enabled) => app.setLoginItemSettings({ openAtLogin: enabled })

// ── Window state persistence ──────────────────────────────────────────────────

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(windowStatePath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return { width: 1200, height: 800 }
  }
}

let saveWindowTimer = null
function saveWindowState() {
  if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized() || mainWindow.isFullScreen()) return
  clearTimeout(saveWindowTimer)
  saveWindowTimer = setTimeout(() => {
    try {
      fs.writeFileSync(windowStatePath(), JSON.stringify(mainWindow.getBounds()))
    } catch {
      /* non-critical: window state save failure is silent */
    }
  }, 400)
}

// ── Electron storage (userData JSON files) ────────────────────────────────────

function storagePath(key) {
  return path.join(app.getPath('userData'), 'storage', key)
}

handle('storage:get', (key) => readJsonFile(storagePath(key)), { logArgs: storageArgs })

handle('storage:put', (key, data) => writeJsonFileAtomic(storagePath(key), JSON.stringify(data)), {
  logArgs: storageArgs,
})

handle('storage:delete', (key) => deleteFile(storagePath(key)), { logArgs: storageArgs })

// ── Local folder storage (Node fs, no browser permission/gesture needed) ─────

handle('localfolder:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return null
  log('info', 'localfolder:picked', { path: result.filePaths[0] })
  return result.filePaths[0]
})

handle('localfolder:get', (basePath, key) => readJsonFile(localFolderFile(basePath, key)), { logArgs: folderArgs })

handle(
  'localfolder:put',
  (basePath, key, data) => writeJsonFileAtomic(localFolderFile(basePath, key), JSON.stringify(data, null, 2)),
  { logArgs: folderArgs },
)

handle('localfolder:delete', (basePath, key) => deleteFile(localFolderFile(basePath, key)), { logArgs: folderArgs })

// ── Tray helpers ──────────────────────────────────────────────────────────────

// Pre-rendered by scripts/generate-icons.mjs from public/favicon.svg (background recolored per state).
// nativeImage has no SVG decoder, so these ship as PNGs rather than being rasterized at runtime.
// Mirrors src/shared/useFaviconIndicator.ts's faviconColor mapping.
const TRAY_ICON_NAMES = {
  red: 'tray-red.png',
  orange: 'tray-orange.png',
  green: 'tray-green.png',
  blue: 'tray-blue.png',
}
const trayIconImages = Object.fromEntries(
  Object.entries(TRAY_ICON_NAMES).map(([name, file]) => [
    name,
    nativeImage.createFromPath(path.join(__dirname, 'icons', file)),
  ]),
)

function trayIconImage(isTracking, isOvertime) {
  if (isOvertime) return isTracking ? trayIconImages.blue : trayIconImages.green
  return isTracking ? trayIconImages.orange : trayIconImages.red
}

function updateTrayDisplay() {
  if (!tray) return
  const { badgeLabel, startedAt, isTracking, isOvertime } = trayState

  tray.setImage(trayIconImage(isTracking, isOvertime))
  tray.setTitle(badgeLabel)

  // Tooltip: receipt-style breakdown (value first, sub-items indented)
  const lines = ['Timetracker']
  for (const line of trayState.receiptLines) {
    if (line.isTotal) {
      lines.push('─────────────')
      lines.push(line.value ? `${line.value}  ${line.label}` : line.label)
    } else if (line.isSubItem) {
      lines.push(`  ${line.value}  ${line.label}`)
    } else {
      lines.push(`${line.value}  ${line.label}`)
    }
  }
  tray.setToolTip(lines.join('\n'))
}

// Renders receipt lines as disabled menu items: value first, sub-items indented, total after separator
function receiptLinesToMenuItems(lines) {
  const items = []
  for (const line of lines) {
    if (line.isTotal) {
      items.push({ type: 'separator' })
      items.push({ label: line.value ? `${line.value}  ${line.label}` : line.label, enabled: false })
    } else if (line.isSubItem) {
      items.push({ label: `  ${line.value}  ${line.label}`, enabled: false })
    } else {
      items.push({ label: `${line.value}  ${line.label}`, enabled: false })
    }
  }
  return items
}

function buildTrayMenu() {
  const {
    receiptLines,
    autoCategory,
    activeSubtaskCategory,
    hasLiveSubtask,
    categories,
    categoryLabels,
    isTracking,
    startedAt,
    presentingMode,
  } = trayState

  const openItem = {
    label: 'Open Timetracker',
    click: () => {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('window:show')
    },
  }

  const infoItems = receiptLinesToMenuItems(receiptLines)

  // While tracking: all categories listed; selected = active subtask, else main category
  const categoryItems = isTracking
    ? categories.map((cat) => {
        const isSelected = activeSubtaskCategory ? cat === activeSubtaskCategory : cat === autoCategory
        return {
          label: categoryLabels?.[cat] ?? cat,
          type: 'checkbox',
          checked: isSelected,
          click: () => {
            if (!isSelected) {
              mainWindow.webContents.send('tray:startSubtask', cat)
            } else if (hasLiveSubtask) {
              mainWindow.webContents.send('tray:stopSubtask')
            } else {
              mainWindow.webContents.send('tray:stopAll')
            }
          },
        }
      })
    : []

  // When not tracking: show all categories to start a new work period
  const startWorkPeriodItems = !isTracking
    ? categories.map((cat) => ({
        label: categoryLabels?.[cat] ?? cat,
        click: () => {
          mainWindow.webContents.send('tray:startWorkPeriod', cat)
        },
      }))
    : []

  // Stop button
  const stopItem = isTracking
    ? [
        { type: 'separator' },
        {
          label: '⏹ Stop All',
          click: () => {
            mainWindow.webContents.send('tray:stopAll')
          },
        },
      ]
    : []

  return Menu.buildFromTemplate(
    withClickLogging([
      openItem,
      { type: 'separator' },
      ...infoItems,
      { type: 'separator' },
      ...(categoryItems.length > 0 ? [...categoryItems, { type: 'separator' }] : []),
      ...(startWorkPeriodItems.length > 0 ? [...startWorkPeriodItems, { type: 'separator' }] : []),
      ...stopItem,
      { type: 'separator' },
      {
        label: 'Display Hours',
        type: 'checkbox',
        checked: !presentingMode,
        click: () => {
          mainWindow.webContents.send('tray:togglePresentingMode')
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ]),
  )
}

function withClickLogging(items) {
  return items.map((item) =>
    item.click
      ? {
          ...item,
          click: (...args) => {
            log('info', 'tray:click', { label: item.label.trim(), checked: item.checked })
            item.click(...args)
          },
        }
      : item,
  )
}

function createTray() {
  const iconPath = path.join(__dirname, 'icons/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setTitle('')
  tray.setToolTip('Timetracker — loading…')
  tray.setContextMenu(buildTrayMenu())
}

function createWindow() {
  const state = loadWindowState()
  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icons/512x512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // The hidden window still drives the tray label via its minute tick;
      // throttled timers leave the tray stale until the window is shown again.
      backgroundThrottling: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Dock icon tracks window visibility: hidden while only the tray is showing.
  app.dock?.hide()
  mainWindow.on('show', () => {
    log('info', 'window:show')
    app.dock?.show()
  })
  mainWindow.on('hide', () => {
    log('info', 'window:hide')
    app.dock?.hide()
  })
  mainWindow.webContents.on('render-process-gone', (_, details) => log('error', 'renderer:gone', details))
  mainWindow.webContents.on('did-fail-load', (_, code, description, url) =>
    log('error', 'renderer:didFailLoad', { code, description, url }),
  )

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)

  if (isDev) {
    mainWindow.loadURL('http://timetracker.localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!loadConfig().startMinimized) mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting && loadConfig().closeToTray !== false) {
      log('info', 'window:close → hidden to tray', { reason: 'closeToTray enabled' })
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function registerGlobalHotkeys({ globalToggle, presentingMode }) {
  log('info', 'hotkeys:register', { globalToggle, presentingMode })
  globalShortcut.unregisterAll()

  if (globalToggle) {
    globalShortcut.register(globalToggle, () => {
      log('info', 'hotkey:globalToggle', { isTracking: trayState.isTracking })
      if (!mainWindow) return
      if (trayState.isTracking) {
        mainWindow.webContents.send('hotkey:toggle')
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }

  if (presentingMode) {
    globalShortcut.register(presentingMode, () => {
      log('info', 'hotkey:presentingMode')
      if (!mainWindow) return
      mainWindow.webContents.send('hotkey:togglePresenting')
    })
  }
}

// The renderer's storage mode (default userData JSON vs. a user-chosen local folder) decides
// where config.json actually lives. That mode itself, and the chosen folder path, are mirrored
// into the default userData storage by the renderer (see bootstrapConfig.ts /
// electron-local-folder-adapter.ts) specifically so the main process can resolve this without
// ever having access to renderer localStorage.
function configJsonPath() {
  try {
    if (JSON.parse(fs.readFileSync(storagePath('local-folder-mode'), 'utf8')) === true) {
      const basePath = JSON.parse(fs.readFileSync(storagePath('local-folder-path'), 'utf8'))
      if (typeof basePath === 'string' && basePath) return localFolderPath(basePath, 'config.json')
    }
  } catch {
    // Flag/path not written yet (or malformed) — fall back to default storage below.
  }
  return storagePath('config.json')
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configJsonPath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function loadGlobalHotkey() {
  const config = loadConfig()
  return config?.hotkeys?.globalToggle ?? null
}

function loadPresentingModeHotkey() {
  const config = loadConfig()
  return config?.hotkeys?.presentingMode ?? null
}

function syncAutoLaunch() {
  try {
    const config = loadConfig()
    const shouldEnable = config?.launchAtLogin === true
    if (shouldEnable !== isLaunchAtLoginEnabled()) setLaunchAtLogin(shouldEnable)
  } catch (err) {
    log('error', 'syncAutoLaunch failed', err)
  }
}

app.whenReady().then(async () => {
  log('info', 'app:ready', { version: app.getVersion(), platform: process.platform, logFile: logFile.file })
  createTray()
  createWindow()

  registerGlobalHotkeys({ globalToggle: loadGlobalHotkey(), presentingMode: loadPresentingModeHotkey() })
  syncAutoLaunch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('window:show')
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  log('info', 'app:quit')
  app.isQuitting = true
  if (elapsedTimer) clearInterval(elapsedTimer)
  globalShortcut.unregisterAll()
})

handle('hotkey:setGlobal', (accelerator) => {
  registerGlobalHotkeys({ globalToggle: accelerator, presentingMode: loadPresentingModeHotkey() })
})

handle('hotkey:setPresenting', (accelerator) => {
  registerGlobalHotkeys({ globalToggle: loadGlobalHotkey(), presentingMode: accelerator })
})

handle('autolaunch:get', () => isLaunchAtLoginEnabled())
handle('autolaunch:set', (enabled) => setLaunchAtLogin(enabled === true))

ipcMain.on('tray:sync', (_, data) => {
  if (!tray) return
  if (data.isTracking !== trayState.isTracking || data.autoCategory !== trayState.autoCategory) {
    log('info', 'tray:stateChanged', {
      isTracking: data.isTracking,
      autoCategory: data.autoCategory,
      activeSubtaskCategory: data.activeSubtaskCategory,
      startedAt: data.startedAt,
    })
  }
  trayState = data

  tray.setContextMenu(buildTrayMenu())
  updateTrayDisplay()

  if (elapsedTimer) clearInterval(elapsedTimer)
  if (data.isTracking && data.startedAt) {
    // The renderer's own timers can be delayed (App Nap, sleep); this one lives in the main process.
    elapsedTimer = setInterval(sendTrayTick, 60_000)
  }
})

function sendTrayTick() {
  mainWindow?.webContents.send('tray:tick')
}

app.whenReady().then(() => {
  powerMonitor.on('suspend', () => log('info', 'power:suspend'))
  powerMonitor.on('lock-screen', () => log('info', 'power:lock'))
  powerMonitor.on('resume', () => {
    log('info', 'power:resume')
    sendTrayTick()
  })
  powerMonitor.on('unlock-screen', () => {
    log('info', 'power:unlock')
    sendTrayTick()
  })
})

// Test-only seam: lets an e2e test click the real "Stop All" tray menu item —
// built by the same buildTrayMenu() the live tray uses — since Playwright has
// no way to drive a native OS tray menu directly.
if (process.env.E2E_ELECTRON_TEST === 'true') {
  global.__e2eClickTrayStopAll = () => {
    const item = buildTrayMenu().items.find((i) => i.label === '⏹ Stop All')
    if (!item) throw new Error('Stop All tray item not present (is a period being tracked?)')
    item.click()
  }

  global.__e2eClickTrayCategory = (label) => {
    const item = buildTrayMenu().items.find((i) => i.label === label)
    if (!item) throw new Error(`Tray category item "${label}" not present`)
    item.click()
  }
}

ipcMain.on('notify:goalReached', () => {
  log('info', 'notify:goalReached')
  if (Notification.isSupported()) {
    new Notification({
      title: 'Timetracker',
      body: "You've reached your daily target!",
    }).show()
  }
})

// Plain show: the 'window:show' event would also re-navigate to the startup view.
ipcMain.on('window:requestShow', () => {
  mainWindow.show()
  mainWindow.focus()
})

ipcMain.on('notify:sprintExportDue', (_, body) => {
  log('info', 'notify:sprintExportDue', { body })
  if (Notification.isSupported()) {
    new Notification({ title: 'Timetracker', body }).show()
  }
})
