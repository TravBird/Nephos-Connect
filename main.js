const { app, BrowserWindow } = require('electron')

let win;
app.whenReady().then(() => {
    win = new BrowserWindow({
      show: false,
    });
    win.setFullScreen(true);
    win.loadFile('main.html')
    win.removeMenu()
    win.show();
  }).catch(console.error);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})