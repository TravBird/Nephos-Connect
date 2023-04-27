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
    async logout(channel: 'logout') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
  },
  ipcRendererOCI: {
    async startSystem(channel: 'start-system', request: any) {
      const result = ipcRenderer.invoke(channel, request);
      return result;
    },
    async stopSystem(channel: 'stop-system', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async listUserSystems(channel: 'list-user-systems') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async terminateSystem(channel: 'terminate-system', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async listSystemConfigurations(channel: 'list-system-configs') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async createSystem(channel: 'create-system', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
  },
  ipcRendererVault: {
    async createSSHKey(
      channel: 'vault-create-ssh-key',
      compartmentID: string,
      keyName: string
    ) {
      const result = await ipcRenderer.invoke(channel, [
        compartmentID,
        keyName,
      ]);
      return result;
    },
    async importSSHKey(channel: 'vault-import-ssh-key', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async listSSHKeys(channel: 'vault-list-ssh-keys') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async getSSHKey(channel: 'vault-get-ssh-key', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async exportSSHKey(channel: 'vault-export-ssh-key', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
  },
  ipcRendererSetup: {
    async setupLocal(channel: 'setup-local') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async setupAccount(channel: 'setup-account') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
  },
  ipcRendererInternet: {
    async getWifiNetworks(channel: 'get-wifi-networks') {
      const result = await ipcRenderer.invoke(channel);
      return result;
    },
    async addWifiNetwork(channel: 'add-wifi-network', args) {
      const result = await ipcRenderer.invoke(channel, args);
      return result;
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
