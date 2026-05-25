const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron')
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

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Open Timetracker', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/favicon.svg')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Timetracker')
  tray.setContextMenu(buildTrayMenu())
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

// IPC: auto-launch toggle called from renderer via preload
const { ipcMain } = require('electron')

ipcMain.handle('autolaunch:get', () => autoLauncher.isEnabled())
ipcMain.handle('autolaunch:set', (_, enabled) =>
  enabled ? autoLauncher.enable() : autoLauncher.disable()
)
