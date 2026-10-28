const { contextBridge, ipcRenderer } = require('electron')

// contextBridge hands the preload a fresh proxy for every callback it is
// passed, so an off(cb) can never find the listener on(cb) registered — the
// unsubscribe has to be a closure created here.
function subscribe(channel, cb) {
  const listener = (_event, ...args) => cb(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('electronAPI', {
  autolaunch: {
    get: () => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  },
  tray: {
    sync: (data) => ipcRenderer.send('tray:sync', data),
    onStartSubtask: (cb) => subscribe('tray:startSubtask', cb),
    onStopSubtask: (cb) => subscribe('tray:stopSubtask', cb),
    onTick: (cb) => subscribe('tray:tick', cb),
    onStopAll: (cb) => subscribe('tray:stopAll', cb),
    onStartWorkPeriod: (cb) => subscribe('tray:startWorkPeriod', cb),
    onTogglePresentingMode: (cb) => subscribe('tray:togglePresentingMode', cb),
  },
  hotkey: {
    onToggle: (cb) => subscribe('hotkey:toggle', cb),
    onTogglePresenting: (cb) => subscribe('hotkey:togglePresenting', cb),
    setGlobal: (accelerator) => ipcRenderer.invoke('hotkey:setGlobal', accelerator),
    setPresenting: (accelerator) => ipcRenderer.invoke('hotkey:setPresenting', accelerator),
  },
  storage: {
    get: (key) => ipcRenderer.invoke('storage:get', key),
    put: (key, data) => ipcRenderer.invoke('storage:put', key, data),
    delete: (key) => ipcRenderer.invoke('storage:delete', key),
  },
  localFolder: {
    pickFolder: () => ipcRenderer.invoke('localfolder:pickFolder'),
    get: (basePath, key) => ipcRenderer.invoke('localfolder:get', basePath, key),
    put: (basePath, key, data) => ipcRenderer.invoke('localfolder:put', basePath, key, data),
    delete: (basePath, key) => ipcRenderer.invoke('localfolder:delete', basePath, key),
  },
  notify: {
    goalReached: () => ipcRenderer.send('notify:goalReached'),
    sprintExportDue: (body) => ipcRenderer.send('notify:sprintExportDue', body),
  },
  log: {
    write: (entry) => ipcRenderer.send('log:write', entry),
    read: () => ipcRenderer.invoke('log:read'),
  },
  window: {
    onShow: (cb) => subscribe('window:show', cb),
    show: () => ipcRenderer.send('window:requestShow'),
  },
})
