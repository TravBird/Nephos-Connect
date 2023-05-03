/* eslint-disable import/extensions */
/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, BrowserView } from 'electron';
import jwtDecode from 'jwt-decode';
import os from 'os';
import fs from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import IDCSAuth from './idcs_auth';
import {
  OCIConnect,
  CreateProfile,
  PofileExists,
  GenerateKeys,
  DecryptWrappedKey,
} from './oci_connect';

const { URL } = require('url');
const shutdown = require('electron-shutdown-command');

const wifi = require('node-wifi');

wifi.init({
  iface: null,
});

let mainWindow: BrowserWindow;
// let authWindow: BrowserView | null = null;
// let ociConnectUser: OCIConnect | null = null;
const ociConnectAdmin = new OCIConnect('DEFAULT');
let newUserName = '';

let ociConnectUser: OCIConnect;

// handle shutdown request from renderer
ipcMain.handle('shutdown', () => {
  console.log('shutdown request received');
  shutdown.shutdown();
});

function launchVNCSoftware(ipAddress: string, sshKey: string) {
  // Testing function to launch VNC software

  // find TigerVNC vncviewer location on linux, mac and windows
  let vncPath = '';
  if (os.platform() === 'win32') {
    vncPath = path.join('C:', 'Program Files', 'TigerVNC', 'vncviewer.exe');
  } else if (os.platform() === 'darwin') {
    vncPath = path.join(
      '/',
      'Applications',
      'TigerVNC Viewer.app',
      'Contents',
      'MacOS',
      'vncviewer'
    );
  } else {
    vncPath = path.join('/', 'usr', 'bin', 'vncviewer');
  }

  // Connect to VNC with IP address and SSH key
  const vnc = require('child_process').spawn(vncPath, [
    ipAddress,
    '-via',
    `root@${ipAddress}`,
    '-viaKey',
    sshKey,
  ]);
  vnc.stdout.on('data', (data: any) => {
    console.log(`stdout: ${data}`);
  });
  vnc.stderr.on('data', (data: any) => {
    console.error(`stderr: ${data}`);
  });
  vnc.on('close', (code: any) => {
    console.log(`child process exited with code ${code}`);
  });
}

async function loginWindowChange(
  idcsAuth: IDCSAuth,
  authWindow: BrowserView
): Promise<{ success: string; idToken: string }> {
  return new Promise<{ success: string; idToken: string }>((resolve) => {
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
          idcsAuth.setAuthToken(token);
          // closing auth window
          mainWindow.setBrowserView(null);

          authWindow.webContents.session.clearStorageData();
          authWindow.webContents.session.clearAuthCache();

          // making access token request
          try {
            const tokens = await idcsAuth.accessTokenRequest();
            // console.log(tokens);
            const idToken = tokens.id_token;
            const accessToken = tokens.access_token;
            idcsAuth.setAccessToken(accessToken);
            return resolve({ success: 'true', idToken });
          } catch (error) {
            console.log(error);
            return resolve({ success: 'false', idToken: '' });
          }
        }
      }
    });
  });
}

async function registerWindowChange(authWindow: BrowserView) {
  return new Promise<{}>((resolve) => {
    // awaiting for url change
    authWindow.webContents.on('will-navigate', async (event, url) => {
      if (url.includes('ui/v1/signin')) {
        // User cancelled registration
        mainWindow.setBrowserView(null);
        authWindow.webContents.destroy();
        return resolve({ success: 'false' });
      }
      if (url.includes('/ui/v1/myconsole')) {
        // User registered successfully
        mainWindow.setBrowserView(null);
        authWindow.webContents.destroy();
        return resolve({ success: 'true' });
      }
    });
  });
}

// User setup functions
async function firstTimeUserSetup(): Promise<{ success: string }> {
  return new Promise<{ success: string }>((resolve) => {
    try {
      // create compartment for the user
      ociConnectAdmin.createCompartment(ociConnectUser.getProfileName());
      resolve({ success: 'true' });
      return;
    } catch (error) {
      console.log(error);
      resolve({ success: 'false' });
    }
  });
}

async function setupLocalUser(
  name: string,
  userOCID: string
): Promise<{
  success: string;
  setupRequired: string;
  message: string;
  error?: any;
}> {
  console.log('Generating keys...');
  const result = await GenerateKeys();
  const { publicKey, privateKey, fingerprint }: any = result;
  try {
    // generate key and fingerprint
    // upload generated keys to OCI
    console.log('Keys generated, uploading to OCI...');
    await ociConnectAdmin.addApiKeyToUser(publicKey, userOCID);
    console.log('Keys uploaded to OCI successfully');

    // write key to file
    console.log('Writing key to file...');
    const keyName = name.replace(/[^\w-]/g, '');
    const KeyFile = `oci_api_key_${keyName}.pem`;
    fs.writeFileSync(path.join(os.homedir(), '.oci/keys', KeyFile), privateKey);
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
    // checking if user compartment exists and account is setup
    const userCompartment = await ociConnectAdmin.findUserCompartment(name);
    if (userCompartment !== undefined) {
      console.log('Compartment already setup');
      // console.log('Setting user compartment to:', userCompartment.id);
      // ociConnectUser.setUserCompartment(userCompartment.id);
      return {
        success: 'true',
        setupRequired: 'false',
        message: '',
      };
    }
    console.log('Additional setup required');
    return {
      success: 'true',
      setupRequired: 'true',
      message: 'account',
    };
  } catch (error: any) {
    console.log(error);
    return { success: 'false', setupRequired: 'false', message: '', error };
  }
}

// login and register functionallity
async function loginCheck(
  name: string
): Promise<{ success: string; setupRequired: string; message: string }> {
  console.log('Login Check for:', name);
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
        message: '',
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

// login and register Handlers
ipcMain.handle('oci-login-sso', async () => {
  console.log('Login SSO');
  const idcsAuth = new IDCSAuth();
  const authWindow = new BrowserView();
  authWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow.setBrowserView(authWindow);
  const bounds = mainWindow.getBounds();

  // login
  authWindow.webContents.loadURL(idcsAuth.getAuthURL());
  authWindow.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
  });
  console.log('Waiting for URL to change...');
  const result = await loginWindowChange(idcsAuth, authWindow);
  if (result === undefined || result === null) {
    return { success: 'false' };
  }

  if (result.success === 'true') {
    const { idToken } = result;
    const name = jwtDecode(idToken).sub;
    const loginResponse = await loginCheck(name);
    if (loginResponse.success === 'true') {
      return loginResponse;
    }
    return { success: 'false' };
  }
  return { success: 'false' };
});

ipcMain.handle('post-setup-login', async () => {
  console.log('Post Setup Login');
  const loginResponse = await loginCheck(newUserName);
  if (loginResponse.success === 'true') {
    return loginResponse;
  }
  return { success: 'false' };
});

ipcMain.handle('setup-local', async () => {
  try {
    const userOCID = await ociConnectAdmin.getUserOCID(newUserName);
    console.log('User OCID:', userOCID);
    const result = await setupLocalUser(newUserName, userOCID);
    console.log('Setup Local Result:', result);

    if (result.success === 'true') {
      console.log('User setup successfully');
      if (result.setupRequired === 'false') {
        return {
          success: 'true',
          setupRequired: 'false',
          message: '',
        };
      }
      // need to create ociConnectUser here
      ociConnectUser = new OCIConnect(newUserName);
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
      error: result.error.message,
    };
  } catch (error: any) {
    console.log(error);
    return {
      success: 'false',
      setupRequired: 'true',
      message: '',
      error: error.message,
    };
  }
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
  const authWindow = new BrowserView();
  authWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow.setBrowserView(authWindow);
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
ipcMain.handle(
  'create-system',
  async (event, { displayName, instanceConfigurationId }) => {
    // generate keys
    try {
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      const { publicKey, privateKey } = await GenerateKeys();

      const system = await ociConnectUser.launchInstanceFromConfig(
        instanceConfigurationId,
        displayName,
        publicKey
      );

      // upload to OCI Vault
      const secret = await ociConnectUser.createSecret(privateKey, secretName);

      event.sender.send('start-system', { success: 'true', system, error: '' });

      // Check if system is up by polling api every 5 seconds
      const interval = setInterval(async () => {
        const systemStatus = await ociConnectUser.instanceStatus(system.id);
        console.log('System Status: ', systemStatus);
        if (systemStatus === 'RUNNING') {
          clearInterval(interval);
          // inform renderer process that system is up
          event.sender.send('start-system', {
            success: 'true',
            system,
            error: '',
          });
          // get system IP
          const systemIP = await ociConnectUser.getInstanceIP(system.id);
          // connect to system
          launchVNCSoftware(systemIP, privateKey);
          return {
            success: 'true',
            message: 'Connecting to system',
            error: '',
          };
        }
      }, 5000);

      // return public key
      return { success: 'true', system, error: '' };
    } catch (error: any) {
      console.log(
        'Exception in create-system icpMain handler in main.ts file: ',
        error
      );
      if (error.statusCode === 409) {
        return {
          success: 'false',
          system: null,
          error: 'System Names must be unique! \n Please try again.',
        };
      }
      return { success: 'false', system: null, error: error.message };
    }
  }
);

// start and stop OCI VM System
ipcMain.handle(
  'start-system',
  async (event, { displayName, instanceId }: any) => {
    console.log('start-system received');
    // Get systems Private Key to connect with
    try {
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      const privateKey = await ociConnectUser.getSecretContent(secretName);

      // start system
      const system = ociConnectUser.startInstance(instanceId);

      event.sender.send('start-system', { success: 'true', system, error: '' });

      // Check if system is up by polling api every 5 seconds
      const interval = setInterval(async () => {
        const systemStatus = await ociConnectUser.instanceStatus(instanceId);
        console.log('System Status: ', systemStatus);
        if (systemStatus === 'RUNNING') {
          clearInterval(interval);
          // inform renderer process that system is up
          event.sender.send('start-system', {
            success: 'true',
            system,
            error: '',
          });
          // get system IP
          const systemIP = await ociConnectUser.getInstanceIP(instanceId);
          // connect to system
          launchVNCSoftware(systemIP, privateKey);
          return {
            success: 'true',
            message: 'Connecting to system',
            error: '',
          };
        }
      }, 5000);
    } catch (error: any) {
      console.log(
        'Exception in start-system icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', system: null, error };
    }
  }
);

ipcMain.handle('stop-system', async (event, arg) => {
  console.log('stop-system received');
  return ociConnectUser.stopInstance(arg);
});
// Terminate System
ipcMain.handle('terminate-system', async (event, arg) => {
  console.log('termiante-system received');
  return ociConnectUser.terminateInstance(arg);
});

ipcMain.handle('list-user-systems', async () => {
  console.log('list-user-systems received');
  try {
    const systems = await ociConnectUser.listUserInstances();
    console.log('Systems received from OCI: ', systems);
    return { success: 'true', systems };
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
  console.log('list-system-config request received');
  try {
    const configs = await ociConnectUser.listInstanceConfigurations();
    console.log('Configs received from OCI: ', configs);
    return { success: 'true', configs };
  } catch (error) {
    console.log(
      'Exception in list-system-config icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});
/*
// OCI Vault listeners
// Create new SSH Key
ipcMain.handle(
  'vault-create-ssh-key',
  async (event, { displayName, instanceConfigurationId }) => {
    // generate keys
    try {
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      const { publicKey, privateKey } = await GenerateKeys();

      // upload to OCI Vault
      const secret = await ociConnectUser.createSecret(privateKey, secretName);

      const system = await ociConnectUser.launchInstanceFromConfig(
        instanceConfigurationId,
        displayName,
        publicKey
      );

      // return public key
      return { success: 'true', system };
    } catch (error: any) {
      console.log(
        'Exception in vault-create-ssh-key icpMain handler in main.ts file: ',
        error
      );
      if (error.statusCode === 409) {
        return {
          success: 'false',
          message: 'System Names must be unique! \n Please try again.',
        };
      }
      return { success: 'false', error };
    }
  }
);
*/

// Get SSH Key from OCI Vault
ipcMain.handle('vault-export-ssh-key', async (event, keyId: string) => {
  const { publicKey, privateKey } = await GenerateKeys();
  console.log('vault-export-ssh-key received');
  try {
    const key = await ociConnectAdmin.exportSSHKey(keyId, publicKey);
    console.log('Key received from OCI: ', key.encryptedKey);
    // const decryptedSSHKey = await DecryptKey(privateKey, key.encryptedKey);

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

ipcMain.handle('logout', async () => {
  console.log('logout received');
  // Run logout cleanup
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
