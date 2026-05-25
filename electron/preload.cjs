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
})
