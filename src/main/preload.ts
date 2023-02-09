import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronHandler = {
  ipcRenderer: {
    async login(channel: 'login', username: string, password: string) {
      return ipcRenderer.invoke(channel, username, password);
    },

    async register(channel: 'register', username: string, password: string) {
      return ipcRenderer.invoke(channel, username, password);
    },
  },
  ipcRendererOCI: {
    async ociConnectTest(channel: 'oci-connect-test', request: any) {
      return ipcRenderer.invoke(channel, request);
    },
    async listInstanceConfigs(channel: 'instance-configs', request: any) {
      return ipcRenderer.invoke(channel, request);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
