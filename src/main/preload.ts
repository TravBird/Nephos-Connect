import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronHandler = {
  ipcRendererOCIauth: {
    async login(channel: 'oci-login', username: string, password: string) {
      const result = await ipcRenderer.invoke(channel, username, password);
      return result;
    },
    async register(
      channel: 'oci-register',
      username: string,
      password: string
    ) {
      const result = await ipcRenderer.invoke(channel, username, password);
      return result;
    },
  },

  ipcRendererOCI: {
    async listInstanceConfigs(channel: 'instance-configs', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async startVM(channel: 'start-vm', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
