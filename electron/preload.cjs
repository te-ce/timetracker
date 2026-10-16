const { contextBridge, ipcRenderer } = require('electron')

// ipcRenderer.removeListener needs the exact function passed to .on, but the
// renderer only knows its own callback — remember the wrapper per callback.
const wrappers = new Map()

function subscribe(channel, cb) {
  const byCb = wrappers.get(channel) ?? new Map()
  wrappers.set(channel, byCb)
  if (byCb.has(cb)) return
  const wrapper = (_event, ...args) => cb(...args)
  byCb.set(cb, wrapper)
  ipcRenderer.on(channel, wrapper)
}

function unsubscribe(channel, cb) {
  const byCb = wrappers.get(channel)
  const wrapper = byCb?.get(cb)
  if (!wrapper) return
  byCb.delete(cb)
  ipcRenderer.removeListener(channel, wrapper)
}

contextBridge.exposeInMainWorld('electronAPI', {
  autolaunch: {
    get: () => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  },
  tray: {
    sync: (data) => ipcRenderer.send('tray:sync', data),
    onStartSubtask: (cb) => subscribe('tray:startSubtask', cb),
    offStartSubtask: (cb) => unsubscribe('tray:startSubtask', cb),
    onStopSubtask: (cb) => subscribe('tray:stopSubtask', cb),
    offStopSubtask: (cb) => unsubscribe('tray:stopSubtask', cb),
    onTick: (cb) => subscribe('tray:tick', cb),
    offTick: (cb) => unsubscribe('tray:tick', cb),
    onStopAll: (cb) => subscribe('tray:stopAll', cb),
    offStopAll: (cb) => unsubscribe('tray:stopAll', cb),
    onStartWorkPeriod: (cb) => subscribe('tray:startWorkPeriod', cb),
    offStartWorkPeriod: (cb) => unsubscribe('tray:startWorkPeriod', cb),
    onTogglePresentingMode: (cb) => subscribe('tray:togglePresentingMode', cb),
    offTogglePresentingMode: (cb) => unsubscribe('tray:togglePresentingMode', cb),
  },
  hotkey: {
    onToggle: (cb) => subscribe('hotkey:toggle', cb),
    offToggle: (cb) => unsubscribe('hotkey:toggle', cb),
    onTogglePresenting: (cb) => subscribe('hotkey:togglePresenting', cb),
    offTogglePresenting: (cb) => unsubscribe('hotkey:togglePresenting', cb),
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
    offShow: (cb) => unsubscribe('window:show', cb),
    show: () => ipcRenderer.send('window:requestShow'),
  },
})
