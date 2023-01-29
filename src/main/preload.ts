import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronHandler = {
  ipcRenderer: {
    async login(channel: 'login', username: string, password: string) {
      return ipcRenderer.invoke(channel, username, password);
    },

    async register(channel: 'Register', username: string, password: string) {
      return ipcRenderer.invoke(channel, username, password);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
