const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  autolaunch: {
    get: () => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled),
  },
})
