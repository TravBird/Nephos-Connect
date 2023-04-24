/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  BrowserView,
  webContents,
} from 'electron';
import log from 'electron-log';
import jwt_decode from 'jwt-decode';
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
} from './oci_connect';

const { URL } = require('url');

const shutdown = require('electron-shutdown-command');

const splash: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserView | null = null;

// let idcsAuth: IDCSAuth | null = null;

let ociConnectUser: OCIConnect | null = null;

const ociConnectAdmin = new OCIConnect('DEFAULT');

let newUserName = '';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
        .compartmentExists(name)
        .then((exists) => {
          if (exists) {
            console.log('User already setup');
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
      if (await ociConnectUser.compartmentExists(name)) {
        console.log('Compartment Exists, user already setup');
        return {
          success: 'true',
          setupRequired: 'false',
        };
      } else {
      console.log('Compartment Does Not Exist, additional setup required');
      return {
        success: 'true',
        setupRequired: 'true',
        message: 'account',
      };
    }
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
  ociConnectUser = new OCIConnect(newUserName);

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

// OCI Request listeners
// get OCI Shapes
ipcMain.handle('instance-configs', async () => {
  ociConnectUser = new OCIConnect(newUserName);
  console.log('instance-configs request received');
  try {
    const configs = await ociConnectUser.listInstanceConfigurations();
    console.log('Configs received from OCI: ', configs);
    return configs;
  } catch (error) {
    console.log(
      'Exception in instance-configs icpMain handler in main.ts file: ',
      error
    );
    return { success: 'false', error };
  }
});

// start OCI VM
// In testing, subject to change
ipcMain.handle('start-vm', async (event, arg) => {
  console.log('start-vm received');
  log.info('start-vm received');
  const info = ociConnectUser.launchInstanceFromConfig(arg);
  return info;
});

ipcMain.handle('logout', async (event, arg) => {
  console.log('logout received');

  authWindow = null;
  ociConnectUser = null;

  return { success: 'true' };
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

  /*
  splash = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#3DCAF5',
  });
  splash.loadURL(
    `file://${path.resolve(__dirname, '../renderer/', 'splash.html')}`
  );
    */

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
      splash?.destroy();
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
