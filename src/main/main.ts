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
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import IDCSAuth from './idcs_auth';
import * as ociConnect from './oci_connect.ts';

const { URL } = require('url');

const shutdown = require('electron-shutdown-command');

const splash: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserView | null = null;

let idcsAuth: IDCSAuth | null = null;

// handle shutdown request from renderer
ipcMain.handle('shutdown', (event, arg) => {
  console.log('shutdown request received');
  shutdown.shutdown();
});

async function windowChange(authWindow: BrowserView) {
  return new Promise((resolve) => {
    // awaiting for url change
    authWindow.webContents.on('will-navigate', async (event, url) => {
      console.log('URL: ', url);
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
          authWindow.webContents.destroy();

          // making access token request
          try {
            const tokens = await idcsAuth?.accessTokenRequest();
            const idToken = tokens?.id_token;
            const accessToken = tokens?.access_token;
            idcsAuth?.setAccessToken(accessToken);
            resolve({ success: 'true', idToken });
          } catch (error) {
            console.log(error);
            resolve({ success: 'false' });
          }
        }
      }
    });
  });
}
// login and register functionallity
// login
ipcMain.handle('oci-login-sso-create', async (event) => {
  idcsAuth = new IDCSAuth();
  authWindow = new BrowserView();
  authWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow?.setBrowserView(authWindow);
  const bounds = mainWindow.getBounds();
  // authWindow.webContents.executeJavaScript("document.getElementById(...)")

  // login
  await authWindow.webContents.loadURL(idcsAuth.getAuthURL());
  authWindow.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
  });
  console.log('Waiting for URL to change...');
  const result = await windowChange(authWindow);
  console.log('result: ', result);
  return result;
});

ipcMain.handle(
  'login',
  async (event, username, password) => {
    console.log('login attempt', username, password);
    log.info('login attempt', username, password);
    if (username === 'test' && password === 'test') {
      console.log('login success!');
      log.info('login success!');
      return { success: 'true' };
    }
    console.log('login failed!');
    log.info('login failed!');
    return { success: 'false' };
  }
  // hardcoded test for now
);

// register
ipcMain.handle('register', async (event, username, password) => {
  console.log('register attempt!', username, password);
  // hardcoded reply for now
  if (username === 'test' && password === 'test') {
    console.log('register failed!');
    return { success: 'true' };
  }
  return { success: 'false' };
});

// OCI Auth listeners
ipcMain.handle('oci-login', async (event, username, password) => {
  console.log('login attempt', username, password);
  log.info('login attempt', username, password);
  const login = idcsAuth.idcsLogin(); // or something
  console.log(login);
  if (login === true) {
    console.log('login success!');
    log.info('login success!');
    return { success: 'true' };
  }
  console.log('login failed!');
  log.info('login failed!');
  return { success: 'false' };
});

ipcMain.handle('oci-register', async (event, username, email) => {
  console.log('oci-register received');
  const register = await ociConnect.createUser(username, email, 'test');
  return register;
});

// OCI Request listeners

// get OCI Shapes
ipcMain.handle('instance-configs', async (event, arg) => {
  console.log('instance-configs request received');
  try {
    const configs = await ociConnect.listInstanceConfigurations();
    console.log('Configs received from OCI: ', configs);
    return configs;
  } catch (err) {
    console.log(
      'Exception in instance-configs icpMain handler in main.ts file: ',
      err
    );
    return err;
  }
});

// start OCI VM
// In testing, subject to change
ipcMain.handle('start-vm', async (event, arg) => {
  console.log('start-vm received');
  log.info('start-vm received');
  const info = ociConnect.launchInstanceFromConfig(arg);
  return info;
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
