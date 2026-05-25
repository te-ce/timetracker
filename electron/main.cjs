const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const AutoLaunch = require('electron-auto-launch')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null
let elapsedTimer = null
let trayState = { activeCategory: null, categories: [], startedAt: null, workedHours: 0, remaining: 0 }

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
    } catch {}
  }, 400)
}

// ── Electron storage (userData JSON files) ────────────────────────────────────

function storagePath(key) {
  const dir = path.join(app.getPath('userData'), 'storage')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${key}.json`)
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
  try { fs.unlinkSync(storagePath(key)) } catch {}
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
  const { activeCategory, startedAt, workedHours, remaining } = trayState

  if (activeCategory && startedAt) {
    tray.setTitle(formatHHMM(elapsedHours(startedAt)))
  } else {
    tray.setTitle('')
  }

  const lines = [`Timetracker`]
  if (activeCategory && startedAt) {
    lines.push(`Tracking: ${activeCategory} (${formatHHMM(elapsedHours(startedAt))})`)
  }
  lines.push(`Worked today: ${formatHHMM(workedHours)}`)
  lines.push(`Remaining: ${formatHHMM(remaining)}`)
  tray.setToolTip(lines.join('\n'))
}

function buildTrayMenu(activeCategory, categories) {
  const openItem = {
    label: 'Open Timetracker',
    click: () => { mainWindow.show(); mainWindow.focus() },
  }

  const categoryItems = categories.map((cat) => ({
    label: cat,
    type: 'radio',
    checked: cat === activeCategory,
    click: () => {
      if (mainWindow) mainWindow.webContents.send('tray:setCategory', cat)
    },
  }))

  return Menu.buildFromTemplate([
    openItem,
    { type: 'separator' },
    ...(categoryItems.length > 0 ? [...categoryItems, { type: 'separator' }] : []),
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])
}

function createTray() {
  const iconPath = path.join(__dirname, 'icons/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setTitle('…')
  tray.setToolTip('Timetracker — loading…')
  tray.setContextMenu(buildTrayMenu(null, []))
  tray.on('click', () => { mainWindow.show(); mainWindow.focus() })
}

function createWindow() {
  const state = loadWindowState()
  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
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
    if (trayState.activeCategory) {
      mainWindow.webContents.send('hotkey:toggle')
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function loadGlobalHotkey() {
  try {
    const raw = fs.readFileSync(storagePath('config.json'), 'utf8')
    const config = JSON.parse(raw)
    return config?.hotkeys?.globalToggle !== undefined
      ? config.hotkeys.globalToggle
      : DEFAULT_GLOBAL_HOTKEY
  } catch {
    return DEFAULT_GLOBAL_HOTKEY
  }
}

app.whenReady().then(() => {
  createTray()
  createWindow()

  registerGlobalHotkey(loadGlobalHotkey())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else { mainWindow.show(); mainWindow.focus() }
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
ipcMain.handle('autolaunch:set', (_, enabled) =>
  enabled ? autoLauncher.enable() : autoLauncher.disable()
)

ipcMain.on('tray:sync', (_, data) => {
  if (!tray) return
  trayState = data

  tray.setContextMenu(buildTrayMenu(data.activeCategory, data.categories))
  updateTrayDisplay()

  if (elapsedTimer) clearInterval(elapsedTimer)
  if (data.activeCategory && data.startedAt) {
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
