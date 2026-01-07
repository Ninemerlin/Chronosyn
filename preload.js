const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chronosynAPI', {
  getTree: () => ipcRenderer.invoke('content:getTree'),
  saveMetadata: (payload) => ipcRenderer.invoke('content:saveMetadata', payload)
});
