/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  BrowserView,
  webContents,
  net,
} from 'electron';
import log from 'electron-log';
import jwt_decode from 'jwt-decode';
import os from 'os';
import fs from 'fs';
import { generateKey } from 'crypto';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import IDCSAuth from './idcs_auth';
import {
  OCIConnect,
  CreateProfile,
  PofileExists,
  GenerateKeys,
  DecryptWrappedKey,
  WrapKey,
} from './oci_connect';

const wifi = require('node-wifi');

wifi.init({
  iface: null,
});

const { URL } = require('url');

const shutdown = require('electron-shutdown-command');

const splash: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserView | null = null;

// let idcsAuth: IDCSAuth | null = null;

let ociConnectUser: OCIConnect | null = null;

const ociConnectAdmin = new OCIConnect('DEFAULT');

let newUserName = '';

// handle shutdown request from renderer
ipcMain.handle('shutdown', () => {
  console.log('shutdown request received');
  shutdown.shutdown();
});

async function loginWindowChange(idcsAuth: IDCSAuth) {
  return new Promise((resolve) => {
    // awaiting for url change
    authWindow.webContents.on('will-navigate', async (event, url) => {
      // getting auth token if url contains callback
      if (url.includes('http://localhost:3000/callback')) {
        // parsing url to get auth token
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get('code');
        if (token !== null && token !== undefined) {
          console.log('User Login Succeeded');
          // setting auth token
          idcsAuth?.setAuthToken(token);
          // closing auth window
          mainWindow?.setBrowserView(null);

          authWindow.webContents.session.clearStorageData();
          authWindow.webContents.session.clearAuthCache();

          authWindow = new BrowserView();

          // making access token request
          try {
            const tokens = await idcsAuth?.accessTokenRequest();
            // console.log(tokens);
            const idToken = tokens?.id_token;
            const accessToken = tokens?.access_token;
            idcsAuth?.setAccessToken(accessToken);
            // testing access
            // const response2 = await idcsAuth?.userInfoRequest();
            resolve({ success: 'true', idToken });
          } catch (error) {
            console.log(error);
            resolve({ success: 'false', idToken: '' });
          }
        }
      }
    });
  });
}

async function registerWindowChange() {
  return new Promise((resolve) => {
    // awaiting for url change
    authWindow.webContents.on('will-navigate', async (event, url) => {
      if (url.includes('ui/v1/signin')) {
        // User cancelled registration
        mainWindow?.setBrowserView(null);
        authWindow.webContents.destroy();
        resolve({ success: 'false' });
      }
      if (url.includes('/ui/v1/myconsole')) {
        // User registered successfully
        mainWindow?.setBrowserView(null);
        authWindow.webContents.destroy();
        resolve({ success: 'true' });
      }
    });
  });
}

// User setup functions
async function firstTimeUserSetup() {
  return new Promise((resolve) => {
    try {
      // create compartment for the user
      ociConnectAdmin?.createCompartment(ociConnectUser?.getProfileName());
      resolve({ success: 'true' });
    } catch (error) {
      console.log(error);
      resolve({ success: 'false' });
    }
  });
}

async function setupLocalUser(name: string, userOCID: string) {
  console.log('Generating keys...');
  console.log(GenerateKeys());
  const result = await GenerateKeys();
  const { publicKey, privateKey, fingerprint } = result;
  return new Promise((resolve) => {
    try {
      // generate key and fingerprint
      // upload generated keys to OCI
      console.log(publicKey, privateKey, fingerprint);
      console.log('Keys generated, uploading to OCI...');
      try {
        ociConnectAdmin.addApiKeyToUser(publicKey, userOCID);
        console.log('Keys uploaded to OCI successfully');
      } catch (error) {
        console.log(error);
        throw error;
      }
      // write key to file
      console.log('Writing key to file...');
      const KeyFile = `oci_api_key_${name}.pem`;
      fs.writeFileSync(
        path.join(os.homedir(), '.oci/keys', KeyFile),
        privateKey
      );
      // create profile
      console.log('Creating profile...');
      CreateProfile(
        name,
        userOCID,
        fingerprint,
        'ocid1.tenancy.oc1..aaaaaaaax25zqrammapt7upslefqq3kv6dzilt6z55yobnf2cmrn3tcimgpa',
        'uk-london-1',
        KeyFile
      );
      ociConnectUser = new OCIConnect(name);
      // checking if user is setup
      ociConnectAdmin
        .findUserCompartment(name)
        .then((userCompartment) => {
          if (userCompartment !== undefined) {
            console.log('User already setup');
            console.log('Setting user compartment to ', userCompartment);
            ociConnectUser?.setUserCompartment(userCompartment.id);
            resolve({ success: 'true', setupRequired: 'false', message: '' });
          }
          console.log('Additional setup required');
          resolve({
            success: 'true',
            setupRequired: 'true',
            message: 'account',
          });
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    } catch (error) {
      console.log(error);
      resolve({ success: 'false' });
    }
  });
}
// login and register functionallity
// login
ipcMain.handle('oci-login-sso', async (event) => {
  console.log('Login SSO');
  const idcsAuth = new IDCSAuth();
  authWindow = new BrowserView();
  authWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow?.setBrowserView(authWindow);
  const bounds = mainWindow.getBounds();
  // authWindow.webContents.executeJavaScript("document.getElementById(...)")

  // login
  authWindow.webContents.loadURL(idcsAuth.getAuthURL());
  authWindow.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
  });
  console.log('Waiting for URL to change...');
  const result = await loginWindowChange(idcsAuth);

  if (result.success === 'true') {
    console.log('SSO Login and Access Token Request Succeeded');
    const { idToken } = result;
    const decoded = jwt_decode(idToken);
    const name = decoded.sub;

    // checking if users profile exists in oci config, if not, creates
    if (PofileExists(name) === true) {
      console.log('Profile Exists');
      ociConnectUser = new OCIConnect(name);
      const userCompartment = await ociConnectAdmin.findUserCompartment(name);
      if (userCompartment !== undefined) {
        console.log('Compartment Exists, user already setup');
        console.log('Setting user compartment to ', userCompartment.id);
        ociConnectUser.setUserCompartment(userCompartment.id);
        return {
          success: 'true',
          setupRequired: 'false',
        };
      }
      console.log('Compartment Does Not Exist, additional setup required');
      return {
        success: 'true',
        setupRequired: 'true',
        message: 'account',
      };
    }
    console.log('Profile Does Not Exist');
    newUserName = name;
    return {
      success: 'true',
      setupRequired: 'true',
      message: 'local',
    };
  }
});

ipcMain.handle('setup-local', async () => {
  const userOCID = await ociConnectAdmin.getUserOCID(newUserName);
  const result = await setupLocalUser(newUserName, userOCID);

  if (result.success === 'true') {
    console.log('User setup successfully');
    if (result.setupRequired === 'false') {
      return {
        success: 'true',
        setupRequired: 'false',
      };
    }
    return {
      success: 'true',
      setupRequired: 'true',
      message: 'account',
    };
  }
  console.log('User setup failed');
  return {
    success: 'false',
    setupRequired: 'true',
    message: 'local',
  };
});

ipcMain.handle('setup-account', async () => {
  const result = await firstTimeUserSetup();
  if (result.success === 'true') {
    console.log('User setup successfully');
    return {
      success: 'true',
    };
  }
  console.log('User setup failed');
  return {
    success: 'false',
  };
});

// register
ipcMain.handle('oci-register-sso', async () => {
  const idcsAuth = new IDCSAuth();
  authWindow = new BrowserView();
  authWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow?.setBrowserView(authWindow);
  const bounds = mainWindow.getBounds();
  // authWindow.webContents.executeJavaScript("document.getElementById(...)")
  // register
  await authWindow.webContents.loadURL(idcsAuth.getRegisterURL());
  authWindow.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
  });
  console.log('Waiting for URL to change...');
  const result = await registerWindowChange(authWindow);
  console.log('result: ', result);
  return { success: 'true' };
});

// OCI Request
// OCI System listeners
// Create new system
ipcMain.handle('create-system', async (event, arg) => {
  console.log('create-system received');
  return ociConnectUser?.launchInstanceFromConfig(arg);
});
// start and stop OCI VM System
ipcMain.handle('start-system', async (event, arg) => {
  console.log('start-system received');
  return ociConnectUser?.startInstance(arg);
});
ipcMain.handle('stop-system', async (event, arg) => {
  console.log('stop-system received');
  return ociConnectUser?.stopInstance(arg);
});
// Terminate System
ipcMain.handle('terminate-system', async (event, arg) => {
  console.log('termiante-system received');
  return ociConnectUser?.terminateInstance(arg);
});

ipcMain.handle('list-user-systems', async () => {
  console.log('list-user-systems received');
  try {
    const systems = await ociConnectUser?.listUserInstances();
    console.log('Systems received from OCI: ', systems);
    return systems;
  } catch (error) {
    console.log(
      'Exception in list-user-systems icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

// get OCI Instance Configs
ipcMain.handle('list-system-configs', async () => {
  // ociConnectUser = new OCIConnect(newUserName);
  console.log('list-system-config request received');
  try {
    const configs = await ociConnectUser?.listInstanceConfigurations();
    console.log('Configs received from OCI: ', configs);
    return configs;
  } catch (error) {
    console.log(
      'Exception in list-system-config icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

// OCI Vault listeners
// Create new SSH Key
ipcMain.handle('vault-create-ssh-key', async (event, [compartmentId, displayName]) => {
  console.log('vault-create-ssh-key received');
  try {
    // generate key pair
    const { publicKey, privateKey, fingerprint } = await GenerateKeys();

    // wrap private key in preparation for upload to OCI Vault
    const wrappedPrivateKey = await WrapKey(publicKey, privateKey);

    // upload wrapped private key and public key to OCI Vault
    const response = await ociConnectAdmin.importSSHKey(
      compartmentId,
      displayName,
      { keyMaterial: wrappedPrivateKey, wrappingAlgorithm: 'RSA_OAEP_AES_SHA256' }
    );
    console.log('Key imported in OCI: ', response);
    return response;
  } catch (error) {
    console.log(
      'Exception in vault-create-ssh-key icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

ipcMain.handle(
  'vault-import-ssh-key',
  async (event, [compartmentId, displayName, wrappedImportKey]) => {
    console.log('vault-import-ssh-key received');

    const wrappedKey =
    try {
      const key = await ociConnectAdmin.importSSHKey(
        compartmentId,
        displayName,
        wrappedImportKey
      );
      console.log('Key imported in OCI: ', key);
      return key;
    } catch (error) {
      console.log(
        'Exception in vault-import-ssh-key icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', error };
    }
  }
);

// List SSH Keys
ipcMain.handle('vault-list-ssh-keys', async () => {
  console.log('vault-list-ssh-keys received');
  try {
    const keys = await ociConnectAdmin.listSSHKeys();
    console.log('Keys received from OCI: ', keys);
    return keys;
  } catch (error) {
    console.log(
      'Exception in vault-list-ssh-keys icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

ipcMain.handle('vault-get-ssh-key', async (event, keyId: string) => {
  console.log('vault-get-ssh-key received');
  try {
    const key = await ociConnectAdmin.getSSHKey(keyId);
    console.log('Key received from OCI: ', key);
    return key;
  } catch (error) {
    console.log(
      'Exception in vault-get-ssh-key icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

ipcMain.handle('vault-export-ssh-key', async (event, keyId: string) => {
  const { publicKey, privateKey, fingerprint } = await GenerateKeys();
  console.log('vault-export-ssh-key received');
  try {
    const key = await ociConnectAdmin.exportSSHKey(keyId, publicKey);
    console.log('Key received from OCI: ', key.encryptedKey);
    //const decryptedSSHKey = await DecryptKey(privateKey, key.encryptedKey);

    const decryptedSSHKey = DecryptWrappedKey(privateKey, key.encryptedKey);
    console.log('Decrypted SSH Key: ', decryptedSSHKey);
    return decryptedSSHKey;
  } catch (error) {
    console.log(
      'Exception in vault-export-ssh-key icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

ipcMain.handle('logout', async () => {
  console.log('logout received');

  authWindow = null;
  ociConnectUser = null;

  return { success: 'true' };
});

// WiFi listeners
ipcMain.handle('get-wifi-networks', async () => {
  console.log('get-wifi-networks received');

  try {
    const networks = await wifi.scan();
    console.log('Networks received from WiFi: ', networks);
    networks.reverse();
    return networks;
  } catch (error) {
    console.log(error);
    return { success: 'false', error };
  }
});

ipcMain.handle('add-wifi-network', async (event, arg) => {
  console.log('add-wifi-network received');
  try {
    const result = await wifi.connect({ ssid: arg[0], password: arg[1] });
    console.log(result);
    if (result.includes('Error')) {
      return { success: 'false', error: result };
    }
    return { success: 'true' };
  } catch (error) {
    console.log(error);
    return { success: 'false', error };
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

// create the browser window
const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // adjust the window size
  mainWindow = new BrowserWindow({
    frame: true,
    fullscreen: false,
    show: false,
    icon: getAssetPath('icon.png'),
    backgroundColor: '#3DCAF5',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
