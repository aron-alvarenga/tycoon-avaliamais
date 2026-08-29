/**
 * Processo main do Electron - Avalia+ Tycoon da Educação.
 * Abre a janela e carrega o build do Vite (dist/) ou o dev server.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Avalia+ Tycoon da Educação',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Dev: rodando com "electron ." (não empacotado) ou NODE_ENV=development
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // Produção: carrega o index.html gerado pelo Vite em dist/
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
