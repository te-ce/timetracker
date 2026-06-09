const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  autolaunch: {
    get: () => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  },
  tray: {
    sync: (data) => ipcRenderer.send('tray:sync', data),
    onStartSubtask: (cb) => ipcRenderer.on('tray:startSubtask', (_, cat) => cb(cat)),
    offStartSubtask: (cb) => ipcRenderer.removeListener('tray:startSubtask', cb),
    onStopSubtask: (cb) => ipcRenderer.on('tray:stopSubtask', () => cb()),
    offStopSubtask: (cb) => ipcRenderer.removeListener('tray:stopSubtask', cb),
    onStopAll: (cb) => ipcRenderer.on('tray:stopAll', () => cb()),
    offStopAll: (cb) => ipcRenderer.removeListener('tray:stopAll', cb),
  },
  hotkey: {
    onToggle: (cb) => ipcRenderer.on('hotkey:toggle', cb),
    offToggle: (cb) => ipcRenderer.removeListener('hotkey:toggle', cb),
    setGlobal: (accelerator) => ipcRenderer.invoke('hotkey:setGlobal', accelerator),
  },
  storage: {
    get: (key) => ipcRenderer.invoke('storage:get', key),
    put: (key, data) => ipcRenderer.invoke('storage:put', key, data),
    delete: (key) => ipcRenderer.invoke('storage:delete', key),
  },
  notify: {
    goalReached: () => ipcRenderer.send('notify:goalReached'),
  },
})
