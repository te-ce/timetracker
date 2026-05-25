const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  autolaunch: {
    get: () => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  },
  tray: {
    sync: (data) => ipcRenderer.send('tray:sync', data),
    onSetCategory: (cb) => ipcRenderer.on('tray:setCategory', (_, cat) => cb(cat)),
    offSetCategory: (cb) => ipcRenderer.removeListener('tray:setCategory', cb),
  },
  hotkey: {
    onToggle: (cb) => ipcRenderer.on('hotkey:toggle', cb),
    offToggle: (cb) => ipcRenderer.removeListener('hotkey:toggle', cb),
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
