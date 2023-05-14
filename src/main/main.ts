/* eslint-disable import/extensions */
/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  BrowserView,
  screen,
} from 'electron';
import jwtDecode from 'jwt-decode';
import os from 'os';
import fs from 'fs';
import { createTunnel } from 'tunnel-ssh';
import { stringify } from 'querystring';
import { Server } from 'http';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import IDCSAuth from './idcs_auth';
import {
  OCIConnect,
  CreateProfile,
  PofileExists,
  GenerateKeys,
} from './oci_connect';

const sshpk = require('sshpk');
const forge = require('node-forge');

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

async function connectVNC(ipAddress: string, sshKey: string) {
  // Testing function to launch VNC software
  const pemKey2 = forge.pki.privateKeyFromPem(sshKey);
  const sshKey2 = forge.ssh.privateKeyToOpenSSH(pemKey2);

  // set up ssh tunnel
  const port = 5901;

  const tunnelOptions = {
    autoClose: true,
  };
  const serverOptions = {
    port,
  };
  const sshOptions = {
    host: ipAddress,
    username: 'ubuntu',
    port: 22,
    privateKey: sshKey2,
  };
  const forwardOptions = {
    srcAddr: '0.0.0.0',
    srcPort: port,
    dstAddr: '127.0.0.1',
    dstPort: port,
  };

  console.log('Creating SSH tunnel with following options: ');
  console.log(tunnelOptions);
  console.log(serverOptions);
  console.log(sshOptions);
  console.log(forwardOptions);
  console.log(ipAddress);
  console.log(sshKey2);

  const [server, conn] = [null, null];

  await createTunnel(
    tunnelOptions,
    serverOptions,
    sshOptions,
    forwardOptions
  ).then(([server, conn], error) => {
    server.on('error', (e) => {
      console.log(e);
    });

    conn.on('error', (e) => {
      console.log(e);
    });

    conn.on('close', () => {
      console.log('Connection closed');
    });

    server.on('connection', (connection) => {
      console.log('new connection');
    });
  });

  // hardcoded for development
  const vncPath = '/opt/homebrew/bin/vncviewer';

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  console.log(`width: ${width}, height: ${height}`);
  // launch vncviewer with spawn
  const { execFile } = require('child_process');
  console.log('Launching VNC Viewer');
  try {
    const vncViewer = await execFile(vncPath, [
      '-Maximize',
      `-geometry=${width}x${height}`,
      '-RemoteResize',
      '-CompressLevel=2',
      '-QualityLevel=5',
      '-AutoSelect=1',
      '-FullScreenMode=All',
      '-FullScreen=0',
      '-FullscreenSystemKeys=1',
      `-DesktopSize=${width}x${height}`,
      `localhost::${port}`,
    ]);
    vncViewer.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    vncViewer.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    vncViewer.on('close', (code, signal) => {
      console.error(
        `VNC process exited with code ${code} and signal ${signal}`
      );
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
    vncViewer.on('error', (err) => {
      console.error(`Failed to start VNC Viewer process: ${err}`);
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
    vncViewer.on('exit', (code, signal) => {
      console.log(
        `VNC Viewer process exited with code ${code} and signal ${signal}`
      );
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
  } catch (error) {
    console.log('VNC viewer closed unexpectedly', error);
    // close ssh tunnel
    console.log('Closing SSH Tunnel');
    return false;
  }
  return true;
}

async function connectRDP(
  ipAddress: string,
  username: string,
  password: string
) {
  const rdpPath = '/opt/homebrew/bin/xfreerdp';
  const { execFile } = require('child_process');
  console.log('Launching RDP Viewer');
  try {
    const rdpViewer = await execFile(rdpPath, [
      `/u:${username}`,
      `/p:${password}`,
      `/v:${ipAddress}`,
      '/sound:sys:alsa',
      '/microphone:sys:alsa',
      // '/usb:id,dev:1a86:7523',
    ]);
    rdpViewer.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    rdpViewer.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    rdpViewer.on('close', (code, signal) => {
      console.error(
        `RDP process exited with code ${code} and signal ${signal}`
      );
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
    rdpViewer.on('error', (err) => {
      console.error(`Failed to start RDP process: ${err}`);
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
    rdpViewer.on('exit', (code, signal) => {
      console.log(`RDP process exited with code ${code} and signal ${signal}`);
      // close ssh tunnel
      console.log('Closing SSH Tunnel');
      return false;
    });
  } catch (error) {
    console.log('RDP viewer closed unexpectedly', error);
    // close ssh tunnel
    console.log('Closing SSH Tunnel');
    return false;
  }
  return true;
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
  async (event, { instanceConfigurationId, displayName, operatingSystem }) => {
    try {
      event.sender.send(
        'create-system-update',
        'Create System Request Recieved'
      );
      // creating secret name
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      // generating keys
      event.sender.send('create-system-update', 'Generating Keys');
      const { publicKey, privateKey } = await GenerateKeys();

      // convert public key to pem
      const pemKey = sshpk.parseKey(publicKey, 'pem');
      const sshRsa = pemKey.toString('ssh');
      console.log('SSH RSA: ', sshRsa);

      // convert private key to ssh-rsa
      const sshRsaPrivateKey = sshpk.parsePrivateKey(privateKey, 'pem');
      const sshRsaPrivateKeyString = sshRsaPrivateKey.toString('ssh');
      console.log('SSH RSA Private Key: ', sshRsaPrivateKeyString);

      // launch instance
      event.sender.send('create-system-update', 'Launching your System!');
      const system = await ociConnectUser.launchInstanceFromConfig(
        instanceConfigurationId,
        displayName,
        sshRsa
      );

      // upload to OCI Vault
      const secret = await ociConnectUser.createSecret(privateKey, secretName);

      // Check if system is up by polling api every 5 seconds
      event.sender.send('create-system-update', 'Waiting for System to start');
      const interval = setInterval(async () => {
        const systemStatus = await ociConnectUser.instanceStatus(system.id);
        console.log('System Status: ', systemStatus);
        if (systemStatus === 'RUNNING') {
          clearInterval(interval);
          // inform renderer process that system is up
          event.sender.send(
            'create-system-update',
            'System up, moving to your compartment'
          );
          // system is up, now move to users compartment
          const workRequest = await ociConnectUser.moveInstance(
            system.id,
            ociConnectUser.getUserCompartment()
          );

          // we can track move progress here
          const moveInterval = setInterval(async () => {
            const moveStatus = await ociConnectUser.getWorkRequestStatus(
              workRequest
            );
            console.log('System Status: ', moveStatus);
            if (moveStatus === 'SUCCEEDED') {
              clearInterval(moveInterval);
              // inform renderer process that system is up
              event.sender.send(
                'create-system-update',
                'System moved, getting IP!'
              );
              // get system IP
              const systemIP = await ociConnectUser.getInstanceIP(system.id);

              event.sender.send(
                'create-system-update',
                'Your System is almost ready, just a little longer!'
              );
              // connect to system
              if (operatingSystem === 'Linux') {
                try {
                  // wait for 50 seconds before connecting for SSH to be up
                  console.log(
                    'Waiting for 50 seconds before connecting to system'
                  );
                  setTimeout(async () => {
                    event.sender.send(
                      'create-system-update',
                      'All done! Connecting to your System'
                    );
                    const closed = await connectVNC(systemIP, privateKey);
                    if (closed === false) {
                      console.log('VNC Closed, stopping system');
                      await ociConnectUser.stopInstance(system.id);
                    }
                    return {
                      success: 'true',
                      message: 'Successfully closed connection',
                      error: '',
                    };
                  }, 50000);
                } catch (error: any) {
                  console.log('Exception in connectVNC: ', error);
                  event.sender.send(
                    'create-system-update',
                    'Exception Occured while connecting to your System, please try again later'
                  );
                  return {
                    success: 'false',
                    message: '',
                    error: error.message,
                  };
                }
              } else {
                try {
                  // get windows initial credentials
                  const [usernmae, password] =
                    await ociConnectUser.getInitialWindowsCredentials(
                      system.id
                    );
                  // wait for 5 seconds before connecting for SSH to be up
                  const closed = await connectRDP(systemIP, usernmae, password);
                  if (closed === false) {
                    console.log('RDP Closed, stopping system');
                    await ociConnectUser.stopInstance(system.id);
                  }
                  return {
                    success: 'true',
                    message: 'Successfully closed connection',
                    error: '',
                  };
                } catch (error: any) {
                  console.log('Exception in connectRDP: ', error);
                  event.sender.send(
                    'create-system-update',
                    'Exception Occured while connecting to your System, please try again later'
                  );
                  return {
                    success: 'false',
                    message: '',
                    error: error.message,
                  };
                }
              }
            }
          }, 5000);
        }
      }, 5000);
      return { success: 'true', message: 'Starting System', error: '' };

      // return public key
    } catch (error: any) {
      event.sender.send('create-system-update', 'Exception Occured');
      console.log(
        'Exception in create-system icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', system: null, error: error.message };
    }
  }
);

// start and stop OCI VM System
ipcMain.handle(
  'start-system',
  async (event, { instanceConfigurationId, displayName, operatingSystem }) => {
    console.log(
      'start-system received: ',
      displayName,
      instanceConfigurationId
    );
    // Get systems Private Key to connect with
    try {
      event.sender.send('start-system-update', 'Start System Request Recieved');
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      const privateKey = await ociConnectUser.getSecretContent(secretName);

      // start system
      event.sender.send('start-system-update', 'Starting your System');
      const system = await ociConnectUser.startInstance(
        instanceConfigurationId
      );
      console.log('system starting: ', system);

      // Check if system is up by polling api every 5 seconds
      const interval = setInterval(async () => {
        const systemStatus = await ociConnectUser.instanceStatus(
          instanceConfigurationId
        );
        console.log('System Status: ', systemStatus);
        if (systemStatus === 'RUNNING') {
          clearInterval(interval);
          // inform renderer process that system is up
          event.sender.send(
            'start-system-update',
            'Your System is almost ready, just a little longer!'
          );

          // get system IP
          const systemIP = await ociConnectUser.getInstanceIP(
            instanceConfigurationId
          );
          // connect to system
          if (operatingSystem === 'Linux') {
            try {
              // wait for 50 seconds before connecting for SSH to be up
              console.log('Waiting for 50 seconds before connecting');
              setTimeout(async () => {
                event.sender.send(
                  'start-system-update',
                  'Your System is ready, connecting now!'
                );
                const closed = await connectVNC(systemIP, privateKey);
                console.log(closed);
                console.log('VNC Closed, stopping system');
                await ociConnectUser.stopInstance(system.id);
                return {
                  success: 'true',
                  message: 'Successfully Connected!',
                  error: '',
                };
              }, 50000);
            } catch (error) {
              console.log('Exception in connectVNC: ', error);
              event.sender.send(
                'start-system-update',
                'Exception Occured while connecting to your System, please try again later'
              );
              return {
                success: 'false',
                message: 'Error Connecting to System',
                error: error.message,
              };
            }
          } else {
            try {
              const [usernmae, password] =
                await ociConnectUser.getInitialWindowsCredentials(system.id);
              // wait for 5 seconds before connecting for SSH to be up
              const closed = await connectRDP(systemIP, usernmae, password);
              if (closed === false) {
                console.log('RDP Closed, stopping system');
                await ociConnectUser.stopInstance(systemId);
              }
              return {
                success: 'true',
                message: 'Successfully closed connection',
                error: '',
              };
            } catch (error: any) {
              console.log('Exception in connectRDP: ', error);
              event.sender.send(
                'start-system-update',
                'Exception Occured while connecting to your System, please try again later'
              );
              return {
                success: 'false',
                message: '',
                error: error.message,
              };
            }
          }
        }
      });
    } catch (error: any) {
      event.sender.send('start-system-update', 'Exception Occured');
      console.log(
        'Exception in start-system icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', system: null, error: error.message };
    }
  }
);

ipcMain.handle(
  'reconnect-system',
  async (event, { systemId, displayName, operatingSystem }) => {
    console.log('reconnect-system received');
    try {
      event.sender.send(
        'reconnect-system-update',
        'Reconnect System Request Recieved'
      );
      const secretName =
        `${ociConnectUser.getProfileName()}-${displayName}`.replace(
          /[^\w-]/g,
          ''
        );
      const privateKey = await ociConnectUser.getSecretContent(secretName);

      const systemIP = await ociConnectUser.getInstanceIP(systemId);
      // connect to system
      event.sender.send(
        'reconnect-system-update',
        'Connecting to your System, this may take a minute'
      );
      if (operatingSystem === 'Linux') {
        try {
          const closed = await connectVNC(systemIP, privateKey);
          console.log(closed);
          console.log('VNC Closed, stopping system');
          await ociConnectUser.stopInstance(systemId);
          return {
            success: 'true',
            message: 'Successfully Connected!',
            error: '',
          };
        } catch (error: any) {
          console.log('Exception in connectVNC: ', error);
          event.sender.send(
            'reconnect-system-update',
            'Exception Occured while connecting to your System, please try again later'
          );
          return {
            success: 'false',
            message: '',
            error: error.message,
          };
        }
      } else {
        try {
          // get windows initial credentials
          const [usernmae, password] =
            await ociConnectUser.getInitialWindowsCredentials(systemId);
          // wait for 5 seconds before connecting for SSH to be up
          const closed = await connectRDP(systemIP, usernmae, password);
          if (closed === false) {
            console.log('RDP Closed, stopping system');
            await ociConnectUser.stopInstance(systemId);
          }
          return {
            success: 'true',
            message: 'Successfully closed connection',
            error: '',
          };
        } catch (error: any) {
          console.log('Exception in connectRDP: ', error);
          event.sender.send(
            'reconnect-system-update',
            'Exception Occured while connecting to your System, please try again later'
          );
          return {
            success: 'false',
            message: '',
            error: error.message,
          };
        }
      }
    } catch (error: any) {
      event.sender.send('reconnect-system-update', 'Exception Occured');
      console.log(
        'Exception in reconnect-system icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', system: null, error: error.message };
    }
  }
);

ipcMain.handle('stop-system', async (event, arg) => {
  console.log('stop-system received');
  return ociConnectUser.stopInstance(arg);
});
// Terminate System
ipcMain.handle(
  'terminate-system',
  async (event, { displayName, instanceId }) => {
    console.log('termiante-system received');
    try {
      // terminate system
      console.log('Terminating instance');
      const result = await ociConnectUser.terminateInstance(instanceId);
      if (result) {
        // delete secret
        const secretName =
          `${ociConnectUser.getProfileName()}-${displayName}`.replace(
            /[^\w-]/g,
            ''
          );
        console.log('Deleting Secret');
        await ociConnectUser.deleteSecret(secretName);
        return { success: 'true', message: 'System Terminated', error: '' };
      }
    } catch (error: any) {
      console.log(
        'Exception in terminate-system icpMain handler in main.ts file: ',
        error
      );
      return { success: 'false', message: null, error: error.message };
    }
  }
);

ipcMain.handle('list-user-systems', async () => {
  console.log('list-user-systems received');
  try {
    const systems = await ociConnectUser.listUserInstances();
    console.log('Systems received from OCI');
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
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow = new BrowserWindow({
    frame: true,
    fullscreen: false,
    show: false,
    width,
    height,
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
