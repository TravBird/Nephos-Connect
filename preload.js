const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI',{
  login: (username, password) => ipcRenderer.invoke('login', username, password)
})

