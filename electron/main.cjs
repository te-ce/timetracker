const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, Notification } = require('electron')
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
  isTracking: false,
  startedAt: null,
}

const autoLauncher = new AutoLaunch({ name: 'Timetracker' })

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

  // Tray title: show badge label (remaining / overtime / done)
  tray.setTitle(badgeLabel || '')

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

function buildTrayMenu() {
  const { receiptLines, autoCategory, activeSubtaskCategory, categories, isTracking, startedAt } = trayState

  const openItem = {
    label: 'Open Timetracker',
    click: () => {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('window:show')
    },
  }

  // Build receipt section: value first, sub-items indented, total after separator
  const infoItems = []
  for (const line of receiptLines) {
    if (line.isTotal) {
      infoItems.push({ type: 'separator' })
      infoItems.push({ label: line.value ? `${line.value}  ${line.label}` : line.label, enabled: false })
    } else if (line.isSubItem) {
      infoItems.push({ label: `  ${line.value}  ${line.label}`, enabled: false })
    } else {
      infoItems.push({ label: `${line.value}  ${line.label}`, enabled: false })
    }
  }

  // Auto category item (first, separated)
  const autoCategoryItems = []
  if (autoCategory && isTracking) {
    const isAutoSelected = !activeSubtaskCategory
    autoCategoryItems.push({
      label: `● ${autoCategory}`,
      type: 'checkbox',
      checked: isAutoSelected,
      click: () => {
        // Clicking auto category while tracking → stop subtasks and work period
        mainWindow.webContents.send('tray:stopAll')
      },
    })
    autoCategoryItems.push({ type: 'separator' })
  }

  // Other category items (only shown while tracking — subtask switching)
  const categoryItems = isTracking
    ? categories
        .filter((cat) => cat !== autoCategory)
        .map((cat) => ({
          label: cat,
          type: 'checkbox',
          checked: cat === activeSubtaskCategory,
          click: () => {
            if (cat === activeSubtaskCategory) {
              mainWindow.webContents.send('tray:stopSubtask')
            } else {
              mainWindow.webContents.send('tray:startSubtask', cat)
            }
          },
        }))
    : []

  // When not tracking: show all categories to start a new work period
  const startWorkPeriodItems = !isTracking
    ? categories.map((cat) => ({
        label: cat,
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
    ...autoCategoryItems,
    ...(categoryItems.length > 0 ? [...categoryItems, { type: 'separator' }] : []),
    ...(startWorkPeriodItems.length > 0 ? [...startWorkPeriodItems, { type: 'separator' }] : []),
    ...stopItem,
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

const DEFAULT_GLOBAL_HOTKEY = 'CommandOrControl+Shift+Space'

function registerGlobalHotkey(accelerator) {
  globalShortcut.unregisterAll()
  if (!accelerator) return
  globalShortcut.register(accelerator, () => {
    if (!mainWindow) return
    if (trayState.isTracking) {
      mainWindow.webContents.send('hotkey:toggle')
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(storagePath('config.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function loadGlobalHotkey() {
  const config = loadConfig()
  return config?.hotkeys?.globalToggle !== undefined ? config.hotkeys.globalToggle : DEFAULT_GLOBAL_HOTKEY
}

async function syncAutoLaunch() {
  try {
    const raw = fs.readFileSync(storagePath('config.json'), 'utf8')
    const config = JSON.parse(raw)
    const shouldEnable = config?.launchAtLogin === true
    const isEnabled = await autoLauncher.isEnabled()
    if (shouldEnable && !isEnabled) await autoLauncher.enable()
    else if (!shouldEnable && isEnabled) await autoLauncher.disable()
  } catch {
    // config not yet written; leave OS autolaunch state unchanged
  }
}

app.whenReady().then(async () => {
  createTray()
  createWindow()

  registerGlobalHotkey(loadGlobalHotkey())
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
  registerGlobalHotkey(accelerator)
})

ipcMain.handle('autolaunch:get', () => autoLauncher.isEnabled())
ipcMain.handle('autolaunch:set', (_, enabled) => (enabled ? autoLauncher.enable() : autoLauncher.disable()))

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
