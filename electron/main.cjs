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
} = require('electron')
const path = require('path')
const fs = require('fs')
const AutoLaunch = require('electron-auto-launch')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null
let elapsedTimer = null
let trayState = {
  receiptLines: [],
  badgeLabel: '',
  autoCategory: null,
  activeSubtaskCategory: null,
  categories: [],
  categoryLabels: {},
  isTracking: false,
  startedAt: null,
  presentingMode: false,
}

const autoLauncher = new AutoLaunch({ name: 'Timetracker' })
console.log('autoLauncher resolved opts:', autoLauncher.opts)

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
  const filePath = path.join(app.getPath('userData'), 'storage', key)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return filePath
}

ipcMain.handle('storage:get', (_, key) => {
  try {
    const raw = fs.readFileSync(storagePath(key), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

ipcMain.handle('storage:put', (_, key, data) => {
  fs.writeFileSync(storagePath(key), JSON.stringify(data))
})

ipcMain.handle('storage:delete', (_, key) => {
  try {
    fs.unlinkSync(storagePath(key))
  } catch {
    /* non-critical: file may not exist */
  }
})

// ── Local folder storage (Node fs, no browser permission/gesture needed) ─────

function localFolderPath(basePath, key) {
  const filename = key.endsWith('.json') ? key : `${key}.json`
  const filePath = path.join(basePath, filename)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return filePath
}

ipcMain.handle('localfolder:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('localfolder:get', (_, basePath, key) => {
  try {
    const raw = fs.readFileSync(localFolderPath(basePath, key), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

ipcMain.handle('localfolder:put', (_, basePath, key, data) => {
  fs.writeFileSync(localFolderPath(basePath, key), JSON.stringify(data, null, 2))
})

ipcMain.handle('localfolder:delete', (_, basePath, key) => {
  try {
    fs.unlinkSync(localFolderPath(basePath, key))
  } catch {
    /* non-critical: file may not exist */
  }
})

// ── Tray helpers ──────────────────────────────────────────────────────────────

function formatHHMM(hours) {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function elapsedHours(startedAt) {
  if (!startedAt) return 0
  return (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
}

function updateTrayDisplay() {
  if (!tray) return
  const { badgeLabel, isTracking, startedAt } = trayState

  // Tray title: recording dot while tracking, then badge label (remaining / overtime / done)
  const dot = isTracking ? '🔴 ' : ''
  tray.setTitle(badgeLabel ? `${dot}${badgeLabel}` : '')

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
            if (isSelected) {
              mainWindow.webContents.send('tray:stopSubtask')
            } else {
              mainWindow.webContents.send('tray:startSubtask', cat)
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

  return Menu.buildFromTemplate([
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
  ])
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
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Dock icon tracks window visibility: hidden while only the tray is showing.
  app.dock?.hide()
  mainWindow.on('show', () => app.dock?.show())
  mainWindow.on('hide', () => app.dock?.hide())

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
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function registerGlobalHotkeys({ globalToggle, presentingMode }) {
  globalShortcut.unregisterAll()

  if (globalToggle) {
    globalShortcut.register(globalToggle, () => {
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

async function syncAutoLaunch() {
  try {
    const config = loadConfig()
    const shouldEnable = config?.launchAtLogin === true
    const isEnabled = await autoLauncher.isEnabled()
    if (shouldEnable && !isEnabled) await autoLauncher.enable()
    else if (!shouldEnable && isEnabled) await autoLauncher.disable()
  } catch (err) {
    console.error('syncAutoLaunch failed:', err)
  }
}

app.whenReady().then(async () => {
  createTray()
  createWindow()

  registerGlobalHotkeys({ globalToggle: loadGlobalHotkey(), presentingMode: loadPresentingModeHotkey() })
  await syncAutoLaunch()

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
  app.isQuitting = true
  if (elapsedTimer) clearInterval(elapsedTimer)
  globalShortcut.unregisterAll()
})

ipcMain.handle('hotkey:setGlobal', (_, accelerator) => {
  registerGlobalHotkeys({ globalToggle: accelerator, presentingMode: loadPresentingModeHotkey() })
})

ipcMain.handle('hotkey:setPresenting', (_, accelerator) => {
  registerGlobalHotkeys({ globalToggle: loadGlobalHotkey(), presentingMode: accelerator })
})

ipcMain.handle('autolaunch:get', () =>
  autoLauncher.isEnabled().catch((err) => {
    console.error('autolaunch:get failed:', err)
    throw err
  }),
)
ipcMain.handle('autolaunch:set', (_, enabled) =>
  (enabled ? autoLauncher.enable() : autoLauncher.disable()).catch((err) => {
    console.error('autolaunch:set failed:', err)
    throw err
  }),
)

ipcMain.on('tray:sync', (_, data) => {
  if (!tray) return
  trayState = data

  tray.setContextMenu(buildTrayMenu())
  updateTrayDisplay()

  if (elapsedTimer) clearInterval(elapsedTimer)
  if (data.isTracking && data.startedAt) {
    elapsedTimer = setInterval(updateTrayDisplay, 60_000)
  }
})

ipcMain.on('notify:goalReached', () => {
  if (Notification.isSupported()) {
    new Notification({
      title: 'Timetracker',
      body: "You've reached your daily target!",
    }).show()
  }
})

ipcMain.on('notify:sprintExportDue', (_, body) => {
  if (Notification.isSupported()) {
    new Notification({ title: 'Timetracker', body }).show()
  }
})
