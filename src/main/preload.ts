import { contextBridge, ipcRenderer } from 'electron';

const electronHandler = {
  ipcRendererShutdown: {
    async shutdown(channel: 'shutdown') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
  },
  ipcRendererOCIauth: {
    async login_sso_create(channel: 'oci-login-sso-create') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async login_sso(channel: 'oci-login-sso') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
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
