import { contextBridge, ipcRenderer } from 'electron';

const electronHandler = {
  ipcRendererShutdown: {
    async shutdown(channel: 'shutdown') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
  },
  ipcRendererOCIauth: {
    async login_sso(channel: 'oci-login-sso') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async register_sso(channel: 'oci-register-sso') {
      const result = await ipcRenderer.invoke(channel);
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
