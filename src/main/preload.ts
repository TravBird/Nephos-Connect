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
    async login(channel: 'oci-login', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
    async post_setup_login(channel: 'post-setup-login', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
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
    async createSystem(
      channel: 'create-system',
      instanceConfigurationId: string,
      displayName: string
    ) {
      const result = await ipcRenderer.invoke(channel, {
        instanceConfigurationId,
        displayName,
      });
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
    async addWifiNetwork(channel: 'add-wifi-network', request: any) {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
