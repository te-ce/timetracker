const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
const path = require('path')
const AutoLaunch = require('electron-auto-launch')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null

const autoLauncher = new AutoLaunch({ name: 'Timetracker' })

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

function buildTrayMenu(activeCategory, categories) {
  const openItem = {
    label: 'Open Timetracker',
    click: () => { mainWindow.show(); mainWindow.focus() },
  }

  if (!categories || categories.length === 0) {
    return Menu.buildFromTemplate([
      openItem,
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
    ])
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
    ...categoryItems,
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])
}

function createTray() {
  const iconPath = path.join(__dirname, 'icons/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip('Timetracker')
  tray.setContextMenu(buildTrayMenu(null, []))
  tray.on('click', () => { mainWindow.show(); mainWindow.focus() })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else { mainWindow.show(); mainWindow.focus() }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => { app.isQuitting = true })

ipcMain.handle('autolaunch:get', () => autoLauncher.isEnabled())
ipcMain.handle('autolaunch:set', (_, enabled) =>
  enabled ? autoLauncher.enable() : autoLauncher.disable()
)

ipcMain.on('tray:sync', (_, { activeCategory, categories }) => {
  if (!tray) return
  tray.setToolTip(activeCategory ? `Tracking: ${activeCategory}` : 'Timetracker')
  tray.setContextMenu(buildTrayMenu(activeCategory, categories))
})
