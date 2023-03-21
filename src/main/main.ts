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
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import * as ociConnect from './oci_connect.ts';

let splash: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

// login and register functionallity
// login
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
  const login = await ociConnect.idcsLogin(); // or something
  if (login === xyz) {
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

  splash = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#3DCAF5',
  });
  splash.loadURL(
    `file://${path.resolve(__dirname, '../renderer/', 'splash.html')}`
  );

  // adjust the window size
  mainWindow = new BrowserWindow({
    frame: false,
    fullscreen: true,
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
