import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronHandler = {
  ipcRendererOCIauth: {
    async login(channel: 'oci-login', username: string, password: string) {
      return ipcRenderer.invoke(channel, username, password);
    },
    async register(
      channel: 'oci-register',
      username: string,
      password: string
    ) {
      return ipcRenderer.invoke(channel, username, password);
    },
  },

  ipcRendererOCI: {
    async listInstanceConfigs(channel: 'instance-configs', request: any) {
      return ipcRenderer.invoke(channel, request);
    },
    async startVM(channel: 'start-vm', request: any) {
      return ipcRenderer.invoke(channel, request);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
