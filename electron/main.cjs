const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const AutoLaunch = require('electron-auto-launch')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null
let elapsedTimer = null
let trayState = { activeCategory: null, categories: [], startedAt: null, workedHours: 0, remaining: 0, sollstunden: 8, priorOvertime: 0 }

const DEFAULT_CATEGORIES = [
  '_LEAVE', '_OTHER', '_COREMEDIA', '_RELEASE', '_SUPPORT',
  '_GUILDS', '_MAINT', '_INFRA', '_ARCH', '_TESTWATCH',
]

function getAllCategoriesLocal(customCategories, categoryOrder) {
  const defaultSet = new Set(DEFAULT_CATEGORIES)
  const unique = customCategories.filter((c) => !defaultSet.has(c))
  const all = [...DEFAULT_CATEGORIES, ...unique]
  if (categoryOrder && categoryOrder.length > 0) {
    const allSet = new Set(all)
    const ordered = categoryOrder.filter((c) => allSet.has(c))
    const orderedSet = new Set(ordered)
    for (const c of all) { if (!orderedSet.has(c)) ordered.push(c) }
    return ordered
  }
  return all
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
    } catch { /* non-critical: window state save failure is silent */ }
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
  try { fs.unlinkSync(storagePath(key)) } catch { /* non-critical: file may not exist */ }
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
    tray.setContextMenu(buildTrayMenu())
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

function buildTrayMenu() {
  const { activeCategory, categories, startedAt, workedHours, sollstunden, priorOvertime } = trayState

  const hoursNeeded = sollstunden - priorOvertime
  let hoursNeededLabel
  if (Math.abs(priorOvertime) < 0.01) {
    hoursNeededLabel = `${formatHHMM(sollstunden)} needed today`
  } else if (priorOvertime > 0) {
    hoursNeededLabel = `${formatHHMM(sollstunden)} − ${formatHHMM(priorOvertime)} = ${formatHHMM(Math.max(0, hoursNeeded))} needed`
  } else {
    hoursNeededLabel = `${formatHHMM(sollstunden)} + ${formatHHMM(-priorOvertime)} = ${formatHHMM(hoursNeeded)} needed`
  }

  const elapsed = startedAt ? elapsedHours(startedAt) : 0
  const totalWorked = workedHours + elapsed
  const remaining = Math.max(0, hoursNeeded - totalWorked)
  const workedLabel = `${formatHHMM(totalWorked)} worked = ${formatHHMM(remaining)} remaining`

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
    { label: hoursNeededLabel, enabled: false },
    { label: workedLabel, enabled: false },
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

  try {
    const raw = fs.readFileSync(storagePath('config.json'), 'utf8')
    const config = JSON.parse(raw)
    trayState.categories = getAllCategoriesLocal(config.customCategories ?? [], config.categoryOrder)
    if (typeof config.sollstunden === 'number') trayState.sollstunden = config.sollstunden
  } catch { /* no stored config yet — use defaults */ }

  tray.setContextMenu(buildTrayMenu())
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
    if (trayState.activeCategory) {
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
  return config?.hotkeys?.globalToggle !== undefined
    ? config.hotkeys.globalToggle
    : DEFAULT_GLOBAL_HOTKEY
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

  tray.setContextMenu(buildTrayMenu())
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
