const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')

async function loginData(username, password) {
  if (username == "test" && password == "password"){
    return "Success!"
  } else {
    return "Invalid Credentials"
  }
}

function createWindow () {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  ipcMain.handle('login', async (event, username, password) => {
    const result = await loginData(username, password)
    return result
  })

  createWindow()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/*
app.whenReady().then(() => {
    win = new BrowserWindow({
      show: false,
    });
    win.setFullScreen(true);
    win.loadFile('pages/login.html')
    win.removeMenu()
    win.show();
  }).catch(console.error);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
*/
