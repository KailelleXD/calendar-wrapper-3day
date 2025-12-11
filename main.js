import { app, BrowserWindow, Menu, Tray, nativeImage, shell, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;

const CAL_URL = 'https://calendar.google.com/calendar/u/0/r/custom/3/d';

async function createWindow() {
  // dynamically import electron-store only when needed
  const { default: Store } = await import('electron-store');
  const store = new Store({ name: 'settings' });

  const { width, height, x, y } = store.get('bounds', {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
  });

mainWindow = new BrowserWindow({
  width,
  height,
  x,
  y,
  title: "Google Calendar - 3 Day Schedule",  // verbatim string
  backgroundColor: '#ffffff',
  show: false,
  autoHideMenuBar: true,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    partition: 'persist:calendar-3day'   // <-- persistent partition
  },
});

mainWindow.webContents.on('did-finish-load', () => {
  // Increase magnification to 125%
  mainWindow.webContents.setZoomFactor(1.1);
});

// After the page loads, override any title changes
mainWindow.webContents.on('page-title-updated', (event) => {
  event.preventDefault(); // stop Google Calendar from changing it
  mainWindow.setTitle("Google Calendar - 3 Day Schedule");
});


  mainWindow.on('close', () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      store.set('bounds', mainWindow.getBounds());
    }
  });

  mainWindow.loadURL(CAL_URL);

  // Maximize the window immediately after creation
  mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

  // Register global shortcut here
  globalShortcut.register('Ctrl+Alt+Shift+3', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Step 1: Reload the page
      mainWindow.webContents.reloadIgnoringCache();
    }
  });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.insertCSS(`
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: #c5c5c5; border-radius: 6px; }
      `);
    });

    const template = [
      {
        label: 'App',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
          { label: 'Back', accelerator: 'Alt+Left', click: () => mainWindow.webContents.goBack() },
          { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow.webContents.goForward() },
          { type: 'separator' },
          { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.toggleDevTools() },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
          { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' },
          { role: 'selectAll' }
        ],
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    const iconPath = path.join(__dirname, 'icon.png');
    try {
      const trayIcon = nativeImage.createFromPath(iconPath);
      tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
      tray.setToolTip('Google Calendar');
      tray.on('click', () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
      });
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show', click: () => mainWindow.show() },
        { label: 'Reload', click: () => mainWindow.reload() },
        { type: 'separator' },
        { role: 'quit' },
      ]));
    } catch (e) {
      // Tray optional
    }
  }); // <-- closes ready-to-show callback

    mainWindow.on('close', () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      store.set('bounds', mainWindow.getBounds());
    }
  });
} // <-- closes createWindow function

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  // Unregister all shortcuts when quitting
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});